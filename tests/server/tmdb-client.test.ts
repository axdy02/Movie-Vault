import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchMovie } from '@/lib/tmdb/client'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('TMDB server client', () => {
  it('sends credentials only as the server Authorization header and returns validated data', async () => {
    vi.stubEnv('TMDB_READ_ACCESS_TOKEN', 'fixture-token-not-secret')
    const fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 1, title: 'Fixture' }), {
        status: 200,
      }),
    )
    vi.stubGlobal('fetch', fetch)
    const result = await fetchMovie(1)
    expect(result.title).toBe('Fixture')
    expect(result).not.toHaveProperty('token')
    const [url, options] = fetch.mock.calls[0]
    expect(String(url)).toBe('https://api.themoviedb.org/3/movie/1')
    expect(options.headers.Authorization).toBe(
      'Bearer fixture-token-not-secret',
    )
    expect(options.signal).toBeInstanceOf(AbortSignal)
  })

  it('rejects malformed payloads and keeps external error details private', async () => {
    vi.stubEnv('TMDB_READ_ACCESS_TOKEN', 'fixture-token-not-secret')
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 'invalid', title: 'Fixture' }), {
        status: 200,
      }),
    )
    vi.stubGlobal('fetch', fetch)
    await expect(fetchMovie(1)).rejects.toMatchObject({
      code: 'EXTERNAL_SERVICE',
      status: 503,
    })
    fetch.mockResolvedValue(
      new Response(
        JSON.stringify({ message: 'private upstream implementation' }),
        { status: 401 },
      ),
    )
    await expect(fetchMovie(1)).rejects.not.toHaveProperty(
      'message',
      'private upstream implementation',
    )
  })

  it('turns timeout/network failure into a recoverable safe error', async () => {
    vi.stubEnv('TMDB_READ_ACCESS_TOKEN', 'fixture-token-not-secret')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new DOMException('Aborted', 'TimeoutError')),
    )
    await expect(fetchMovie(1)).rejects.toMatchObject({
      code: 'EXTERNAL_SERVICE',
      message: 'Movie discovery is temporarily unavailable. Please try again.',
    })
  })

  it('distinguishes an actual upstream 404 from service downtime', async () => {
    vi.stubEnv('TMDB_READ_ACCESS_TOKEN', 'fixture-token-not-secret')
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 404 }))
    vi.stubGlobal('fetch', fetch)
    await expect(fetchMovie(1)).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
    })
    fetch.mockResolvedValue(new Response('{}', { status: 503 }))
    await expect(fetchMovie(1)).rejects.toMatchObject({
      code: 'EXTERNAL_SERVICE',
      status: 503,
    })
  })

  it('rejects unconfigured credentials before trying a request', async () => {
    vi.stubEnv('TMDB_READ_ACCESS_TOKEN', '')
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    await expect(fetchMovie(1)).rejects.toMatchObject({
      code: 'NOT_CONFIGURED',
    })
    expect(fetch).not.toHaveBeenCalled()
  })
})
