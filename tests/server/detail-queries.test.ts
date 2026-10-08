import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getMovie,
  getMovieMetadata,
  getPerson,
  getPersonMetadata,
} from '@/server/queries/vault.queries'
import {
  ConfigurationError,
  ExternalServiceError,
  NotFoundError,
} from '@/lib/auth/errors'
import {
  tmdbMovieCreditsSchema,
  tmdbMovieDetailsSchema,
  tmdbPersonCreditsSchema,
  tmdbPersonDetailsSchema,
} from '@/lib/tmdb/schemas'
import { movie } from '../fixtures/domain'

const mocks = vi.hoisted(() => ({
  configured: false,
  cookieClient: vi.fn(),
  rpc: vi.fn(),
  fetchMovie: vi.fn(),
  fetchCredits: vi.fn(),
  fetchPerson: vi.fn(),
  fetchPersonCredits: vi.fn(),
  providers: vi.fn(),
}))
vi.mock('@/lib/supabase/server', () => ({
  isSupabaseConfigured: () => mocks.configured,
  createSupabaseServerClient: mocks.cookieClient,
}))
vi.mock('@/lib/tmdb/client', () => ({
  fetchMovie: mocks.fetchMovie,
  fetchMovieCredits: mocks.fetchCredits,
  fetchPerson: mocks.fetchPerson,
  fetchPersonCredits: mocks.fetchPersonCredits,
}))
vi.mock('@/server/queries/provider.queries', () => ({
  getProviders: mocks.providers,
}))
const emptyVault = {
  movies: [],
  people: [],
  collections: [],
  events: [],
  editors: [],
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.configured = false
  mocks.cookieClient.mockResolvedValue({ rpc: mocks.rpc })
  mocks.rpc.mockResolvedValue({ data: null, error: null })
  mocks.fetchMovie.mockResolvedValue(
    tmdbMovieDetailsSchema.parse({
      id: 27205,
      title: 'Inception',
      overview: 'A fixture movie.',
    }),
  )
  mocks.fetchCredits.mockResolvedValue(
    tmdbMovieCreditsSchema.parse({ id: 27205 }),
  )
  mocks.fetchPerson.mockResolvedValue(
    tmdbPersonDetailsSchema.parse({ id: 131, name: 'Jake Gyllenhaal' }),
  )
  mocks.fetchPersonCredits.mockResolvedValue(
    tmdbPersonCreditsSchema.parse({ id: 131 }),
  )
  mocks.providers.mockResolvedValue(movie().providers)
})

describe('recoverable detail queries', () => {
  it('returns a missing result only when TMDB actually responds not found', async () => {
    mocks.fetchMovie.mockRejectedValue(new NotFoundError())
    mocks.fetchPerson.mockRejectedValue(new NotFoundError())
    await expect(getMovie(27205)).resolves.toBeNull()
    await expect(getPerson(131)).resolves.toBeNull()
    expect(mocks.providers).not.toHaveBeenCalled()
  })

  it.each([new ExternalServiceError(), new ConfigurationError()])(
    'preserves recoverable movie and person failure: %s',
    async (failure) => {
      mocks.fetchMovie.mockRejectedValue(failure)
      mocks.fetchPerson.mockRejectedValue(failure)
      await expect(getMovie(27205)).rejects.toMatchObject({
        code: failure.code,
        status: 503,
      })
      await expect(getPerson(131)).rejects.toMatchObject({
        code: failure.code,
        status: 503,
      })
    },
  )

  it('keeps saved metadata usable during remote outage', async () => {
    mocks.configured = true
    mocks.rpc.mockResolvedValue({
      data: { ...emptyVault, movies: [movie()] },
      error: null,
    })
    mocks.fetchMovie.mockRejectedValue(new ExternalServiceError())
    const result = await getMovie(27205)
    expect(result?.movie.title).toBe('Inception')
    expect(result?.libraryMovie?.saved).toBe(true)
    expect(mocks.fetchMovie).not.toHaveBeenCalled()
    expect(mocks.fetchCredits).not.toHaveBeenCalled()
  })

  it('retains removed canonical metadata without leaking inactive user state', async () => {
    mocks.configured = true
    mocks.rpc.mockImplementation(async (name: string) => ({
      data: name === 'vault_public_data' ? emptyVault : movie(),
      error: null,
    }))
    const result = await getMovie(27205)
    expect(result?.movie.title).toBe('Inception')
    expect(result?.libraryMovie).toBeNull()
    expect(result?.movie).not.toHaveProperty('states')
    expect(mocks.fetchMovie).not.toHaveBeenCalled()
  })

  it('keeps a person visible when only their broader filmography lookup fails', async () => {
    mocks.fetchPersonCredits.mockRejectedValue(new ExternalServiceError())
    const result = await getPerson(131)
    expect(result?.person.name).toBe('Jake Gyllenhaal')
    expect(result?.filmography).toEqual([])
    expect(result?.error).toContain('Please try again')
  })
})

describe('metadata reads have no provider side effects', () => {
  it('reads minimal movie and person metadata without providers, credits or cache refresh', async () => {
    await expect(getMovieMetadata(27205)).resolves.toMatchObject({
      tmdbId: 27205,
      title: 'Inception',
    })
    await expect(getPersonMetadata(131)).resolves.toMatchObject({
      tmdbId: 131,
      name: 'Jake Gyllenhaal',
    })
    expect(mocks.fetchCredits).not.toHaveBeenCalled()
    expect(mocks.fetchPersonCredits).not.toHaveBeenCalled()
    expect(mocks.providers).not.toHaveBeenCalled()
  })
})
