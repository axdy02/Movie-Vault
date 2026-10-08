import 'server-only'
import { fetchWatchProviders } from '@/lib/tmdb/client'
import { normalizeProviders, providerFreshness } from '@/lib/tmdb/transforms'
import { createProviderCacheClient } from '@/lib/supabase/admin'
import { getEnv } from '@/lib/env'
import { tmdbIdSchema, regionSchema } from '@/lib/validation/mutations'
import type {
  LibraryMovie,
  MutationContext,
  ProviderData,
} from '@/types/domain'
import type { Json } from '@/types/database'

export async function persistProviderSnapshot(
  movieId: string,
  snapshot: ProviderData,
  context: MutationContext,
  actorId?: string,
) {
  const client = createProviderCacheClient()
  const { error } = await client.rpc('vault_provider_snapshot', {
    p_movie_id: movieId,
    p_snapshot: snapshot as unknown as Json,
    p_context: {
      ...context,
      ...(actorId ? { actorUserId: actorId } : {}),
    } as Json,
  })
  if (error) throw new Error('Provider caching failed')
}

export async function getProviders(
  tmdbId: number,
  region = 'IN',
  saved?: LibraryMovie | null,
): Promise<ProviderData> {
  tmdbIdSchema.parse(tmdbId)
  regionSchema.parse(region)
  const cached = saved?.providers?.region === region ? saved.providers : null
  if (cached && providerFreshness(cached.fetchedAt) === 'fresh') return cached
  try {
    const payload = await fetchWatchProviders(tmdbId)
    const snapshot = normalizeProviders(payload, region)
    const env = getEnv()
    if (
      saved &&
      env.SUPABASE_SERVICE_ROLE_KEY &&
      env.NEXT_PUBLIC_SUPABASE_URL
    ) {
      try {
        await persistProviderSnapshot(saved.id, snapshot, {
          surface: 'movie_detail',
          route: `/movie/${tmdbId}`,
          method: 'server_refresh',
        })
      } catch {
        console.error('Provider cache persistence failed')
      }
    }
    return snapshot
  } catch {
    // Keep a regional snapshot when the external API fails, including older data.
    return {
      ...(cached ?? {
        region,
        offers: { flatrate: [], free: [], ads: [], rent: [], buy: [] },
        link: null,
        fetchedAt: null,
      }),
      error: cached
        ? 'Could not refresh availability. Showing the last checked snapshot.'
        : 'Streaming availability could not be checked. Please try again.',
    }
  }
}
