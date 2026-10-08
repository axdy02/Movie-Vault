import 'server-only'
import { cache } from 'react'
import { z } from 'zod'
import {
  ConfigurationError,
  ExternalServiceError,
  NotFoundError,
} from '@/lib/auth/errors'
import { getEnv } from '@/lib/env'
import {
  tmdbMovieCreditsSchema,
  tmdbMovieDetailsSchema,
  tmdbPersonCreditsSchema,
  tmdbPersonDetailsSchema,
  tmdbSearchResponseSchema,
  tmdbWatchProvidersSchema,
} from './schemas'

const API_BASE = 'https://api.themoviedb.org/3'
const idSchema = z.number().int().positive().max(Number.MAX_SAFE_INTEGER)
const querySchema = z.string().trim().min(2).max(120)

async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  options: { revalidate?: number; query?: Record<string, string> } = {},
): Promise<T> {
  const token = getEnv().TMDB_READ_ACCESS_TOKEN
  if (!token)
    throw new ConfigurationError(
      'Movie discovery needs a TMDB connection. Saved movies are still available.',
    )
  const url = new URL(`${API_BASE}${path}`)
  Object.entries(options.query ?? {}).forEach(([key, value]) =>
    url.searchParams.set(key, value),
  )
  let response: Response
  try {
    response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
      ...(options.revalidate === 0
        ? { cache: 'no-store' as const }
        : { next: { revalidate: options.revalidate ?? 86400 } }),
    })
  } catch {
    throw new ExternalServiceError()
  }
  if (response.status === 404) throw new NotFoundError()
  if (!response.ok) {
    console.error('TMDB request failed', {
      endpoint: path,
      status: response.status,
    })
    throw new ExternalServiceError()
  }
  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new ExternalServiceError()
  }
  const validated = schema.safeParse(payload)
  if (!validated.success) {
    console.error('TMDB response validation failed', {
      endpoint: path,
      issues: validated.error.issues.map((issue) => issue.path.join('.')),
    })
    throw new ExternalServiceError()
  }
  return validated.data
}

export const fetchMovie = cache(async (id: number, fresh = false) => {
  return request(`/movie/${idSchema.parse(id)}`, tmdbMovieDetailsSchema, {
    revalidate: fresh ? 0 : 86400,
  })
})

export async function fetchMovieCredits(id: number, fresh = false) {
  return request(
    `/movie/${idSchema.parse(id)}/credits`,
    tmdbMovieCreditsSchema,
    { revalidate: fresh ? 0 : 86400 },
  )
}

export const fetchPerson = cache(async (id: number) => {
  return request(`/person/${idSchema.parse(id)}`, tmdbPersonDetailsSchema)
})

export async function fetchPersonCredits(id: number) {
  return request(
    `/person/${idSchema.parse(id)}/movie_credits`,
    tmdbPersonCreditsSchema,
    { revalidate: 21600 },
  )
}

export async function fetchWatchProviders(id: number) {
  return request(
    `/movie/${idSchema.parse(id)}/watch/providers`,
    tmdbWatchProvidersSchema,
    { revalidate: 0 },
  )
}

export async function searchTmdb(
  query: string,
  type: 'multi' | 'movie' | 'person' = 'multi',
  page = 1,
) {
  return request(`/search/${type}`, tmdbSearchResponseSchema, {
    revalidate: 600,
    query: {
      query: querySchema.parse(query),
      page: String(z.number().int().min(1).max(500).parse(page)),
      include_adult: 'false',
    },
  })
}
