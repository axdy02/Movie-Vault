import 'server-only'
import { cache } from 'react'
import { z } from 'zod'
import {
  createSupabaseServerClient,
  isSupabaseConfigured,
} from '@/lib/supabase/server'
import { requireEditor } from '@/lib/auth/require-editor'
import {
  AppError,
  ExternalServiceError,
  NotFoundError,
} from '@/lib/auth/errors'
import {
  fetchMovie,
  fetchMovieCredits,
  fetchPerson,
  fetchPersonCredits,
} from '@/lib/tmdb/client'
import {
  transformMovie,
  transformPerson,
  transformFilmography,
} from '@/lib/tmdb/transforms'
import { tmdbIdSchema, regionSchema } from '@/lib/validation/mutations'
import type {
  ActivityEvent,
  FilmographyMovie,
  LibraryMovie,
  MovieData,
  PersonData,
  ProviderData,
  VaultData,
} from '@/types/domain'
import {
  activityDataSchema,
  movieDataSchema,
  vaultDataSchema,
} from './vault.schema'
import { getProviders } from './provider.queries'

const emptyVault = (configured: boolean, error?: string): VaultData => ({
  configured,
  movies: [],
  people: [],
  collections: [],
  events: [],
  editors: [],
  ...(error ? { error } : {}),
})

export const getVault = cache(async (region = 'IN'): Promise<VaultData> => {
  regionSchema.parse(region)
  if (!isSupabaseConfigured()) return emptyVault(false)
  try {
    const client = await createSupabaseServerClient()
    const { data, error } = await client.rpc('vault_public_data', {
      p_region: region,
    })
    if (error) throw error
    const parsed = vaultDataSchema.safeParse(data)
    if (!parsed.success) {
      console.error('Vault response validation failed', {
        issues: parsed.error.issues.map((issue) => issue.path.join('.')),
      })
      return emptyVault(
        true,
        'The vault could not be loaded. Please try again.',
      )
    }
    return { configured: true, ...parsed.data }
  } catch {
    console.error('Vault read failed')
    return emptyVault(
      true,
      'The vault connection is temporarily unavailable. Please try again.',
    )
  }
})

export type MovieDetailData = {
  movie: MovieData
  libraryMovie: LibraryMovie | null
  providers: ProviderData
  error?: string
}
const getCachedMovie = cache(
  async (tmdbId: number): Promise<MovieData | null> => {
    if (!isSupabaseConfigured()) return null
    try {
      const client = await createSupabaseServerClient()
      const { data, error } = await client.rpc('vault_cached_movie', {
        p_tmdb_id: tmdbId,
      })
      const parsed = !error ? movieDataSchema.safeParse(data) : null
      return parsed?.success ? parsed.data : null
    } catch {
      console.error('Cached movie lookup failed')
      return null
    }
  },
)

export const getMovieMetadata = cache(
  async (id: number): Promise<MovieData | null> => {
    const tmdbId = tmdbIdSchema.parse(id)
    const vault = await getVault('IN')
    const saved = vault.movies.find((movie) => movie.tmdbId === tmdbId)
    if (saved) return saved
    const cached = await getCachedMovie(tmdbId)
    if (cached) return cached
    try {
      return transformMovie(await fetchMovie(tmdbId))
    } catch (error) {
      if (error instanceof NotFoundError) return null
      throw error instanceof AppError ? error : new ExternalServiceError()
    }
  },
)

export async function getMovie(
  id: number,
  region = 'IN',
): Promise<MovieDetailData | null> {
  const tmdbId = tmdbIdSchema.parse(id)
  regionSchema.parse(region)
  const vault = await getVault(region)
  const saved = vault.movies.find((movie) => movie.tmdbId === tmdbId) ?? null
  if (saved) {
    const providers = await getProviders(tmdbId, region, saved)
    return {
      movie: saved,
      libraryMovie: { ...saved, providers },
      providers,
      ...(providers.error ? { error: providers.error } : {}),
    }
  }
  const cached = await getCachedMovie(tmdbId)
  if (cached)
    return {
      movie: cached,
      libraryMovie: null,
      providers: await getProviders(tmdbId, region),
    }
  try {
    const [movie, credits] = await Promise.all([
      fetchMovie(tmdbId),
      fetchMovieCredits(tmdbId),
    ])
    return {
      movie: transformMovie(movie, credits),
      libraryMovie: null,
      providers: await getProviders(tmdbId, region),
    }
  } catch (error) {
    if (error instanceof NotFoundError) return null
    throw error instanceof AppError ? error : new ExternalServiceError()
  }
}

const activityFiltersSchema = z.object({
  actorId: z.uuid().optional(),
  action: z.string().min(1).max(80).optional(),
  movieId: z.uuid().optional(),
  collectionId: z.uuid().optional(),
  from: z.iso.datetime({ offset: true }).or(z.iso.date()).optional(),
  to: z.iso.datetime({ offset: true }).or(z.iso.date()).optional(),
  page: z.coerce.number().int().min(1).max(2001).default(1),
})
export type ActivityFilters = z.input<typeof activityFiltersSchema>
export async function getActivity(
  filters: ActivityFilters = {},
): Promise<{ events: ActivityEvent[]; total: number; error?: string }> {
  if (!isSupabaseConfigured()) return { events: [], total: 0 }
  const parsed = activityFiltersSchema.safeParse(filters)
  if (!parsed.success)
    return {
      events: [],
      total: 0,
      error: 'Check the activity filters and try again.',
    }
  const from =
    parsed.data.from?.length === 10
      ? `${parsed.data.from}T00:00:00+05:30`
      : parsed.data.from
  const to =
    parsed.data.to?.length === 10
      ? `${parsed.data.to}T23:59:59.999+05:30`
      : parsed.data.to
  if (from && to && Date.parse(from) > Date.parse(to))
    return {
      events: [],
      total: 0,
      error: 'Choose an end date after the start date.',
    }
  try {
    const client = await createSupabaseServerClient()
    const { data, error } = await client.rpc('vault_activity', {
      p_limit: 50,
      p_offset: (parsed.data.page - 1) * 50,
      p_actor: parsed.data.actorId,
      p_action: parsed.data.action,
      p_movie_id: parsed.data.movieId,
      p_collection_id: parsed.data.collectionId,
      p_from: from,
      p_to: to,
    })
    if (error) throw error
    const result = activityDataSchema.safeParse(data)
    if (!result.success) throw new Error('Invalid activity response')
    return result.data
  } catch {
    return {
      events: [],
      total: 0,
      error: 'Activity could not be loaded. Please try again.',
    }
  }
}

export type PersonDetailData = {
  person: PersonData
  filmography: FilmographyMovie[]
  error?: string
}
export const getPersonMetadata = cache(
  async (id: number): Promise<PersonData | null> => {
    const tmdbId = tmdbIdSchema.parse(id)
    try {
      return transformPerson(await fetchPerson(tmdbId))
    } catch (error) {
      const vault = await getVault()
      const person = vault.people.find((entry) => entry.tmdbId === tmdbId)
      if (person) return person
      if (error instanceof NotFoundError) return null
      throw error instanceof AppError ? error : new ExternalServiceError()
    }
  },
)

export async function getPerson(id: number): Promise<PersonDetailData | null> {
  const person = await getPersonMetadata(id)
  if (!person) return null
  try {
    return {
      person,
      filmography: transformFilmography(
        await fetchPersonCredits(person.tmdbId),
      ),
    }
  } catch {
    return {
      person,
      filmography: [],
      error:
        'The broader filmography is temporarily unavailable. Please try again.',
    }
  }
}

export type WatchHistoryEvent = {
  id: string
  userId: string
  movieId: string
  watchedAt: string
  createdAt: string
  correctedFromEventId: string | null
  voidedAt: string | null
}
export async function getWatchHistory(
  movieId: string,
): Promise<WatchHistoryEvent[]> {
  z.uuid().parse(movieId)
  const { client } = await requireEditor()
  const { data, error } = await client
    .from('watch_events')
    .select(
      'id,user_id,movie_id,watched_at,created_at,corrected_from_event_id,voided_at',
    )
    .eq('movie_id', movieId)
    .order('watched_at', { ascending: false })
    .limit(100)
  if (error)
    throw new Error('Watch history could not be loaded. Please try again.')
  return data.map((event) => ({
    id: event.id,
    userId: event.user_id,
    movieId: event.movie_id,
    watchedAt: event.watched_at,
    createdAt: event.created_at,
    correctedFromEventId: event.corrected_from_event_id,
    voidedAt: event.voided_at,
  }))
}

export async function getPersonalNote(movieId: string): Promise<string | null> {
  z.uuid().parse(movieId)
  const { client, editor } = await requireEditor()
  const { data, error } = await client
    .from('user_movie_state')
    .select('personal_note')
    .eq('movie_id', movieId)
    .eq('user_id', editor.id)
    .maybeSingle()
  if (error) throw new Error('Your note could not be loaded. Please try again.')
  return data?.personal_note ?? null
}

export async function getRecentlyWatched(
  limit = 6,
): Promise<{ movieId: string; watchedAt: string }[]> {
  z.number().int().min(1).max(48).parse(limit)
  if (!isSupabaseConfigured()) return []
  try {
    const client = await createSupabaseServerClient()
    const { data, error } = await client
      .from('public_watch_history')
      .select('movie_id,watched_at')
      .order('watched_at', { ascending: false })
      .limit(limit * 10)
    if (error) throw error
    const unique = new Map<string, { movieId: string; watchedAt: string }>()
    for (const event of data) {
      if (event.movie_id && event.watched_at && !unique.has(event.movie_id))
        unique.set(event.movie_id, {
          movieId: event.movie_id,
          watchedAt: event.watched_at,
        })
      if (unique.size === limit) break
    }
    return [...unique.values()]
  } catch {
    console.error('Recent watch history could not be loaded')
    return []
  }
}
