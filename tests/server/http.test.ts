import { describe, expect, it, vi } from 'vitest'
import { apiResponse, assertSameOrigin, readJsonBody } from '@/server/http'
import { GET as search } from '@/app/api/tmdb/search/route'
import { AppError } from '@/lib/auth/errors'

describe('safe HTTP boundary', () => {
  it('requires same-origin requests for mutations', () => {
    expect(() =>
      assertSameOrigin(
        new Request('https://vault.example/api/provider-cache/refresh', {
          headers: { origin: 'https://vault.example' },
        }),
      ),
    ).not.toThrow()
    expect(() =>
      assertSameOrigin(
        new Request('https://vault.example/api/provider-cache/refresh', {
          headers: { origin: 'https://attacker.example' },
        }),
      ),
    ).toThrow(AppError)
    expect(() =>
      assertSameOrigin(
        new Request('https://vault.example/api/provider-cache/refresh'),
      ),
    ).toThrow(AppError)
  })

  it('never sends an unknown technical error to the browser', async () => {
    const response = await apiResponse(async () => {
      throw new Error('SQL statement and secret credential must remain private')
    })
    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body).toEqual({
      error: 'Something went wrong. Please try again.',
      code: 'UNEXPECTED_ERROR',
    })
    expect(response.headers.get('cache-control')).toBe('no-store')
  })

  it('rejects malformed and oversized JSON before mutation work', async () => {
    await expect(
      readJsonBody(
        new Request('https://vault.example/api', {
          method: 'POST',
          body: '{invalid',
        }),
      ),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT', status: 400 })
    await expect(
      readJsonBody(
        new Request('https://vault.example/api', {
          method: 'POST',
          body: JSON.stringify({ note: 'x'.repeat(8000) }),
        }),
      ),
    ).rejects.toMatchObject({ status: 413 })
  })

  it.each([
    'q=x',
    `q=${'x'.repeat(121)}`,
    'q=valid&type=tv',
    'q=valid&page=501',
    'q=valid&page=-1',
  ])(
    'rejects invalid search parameters without external calls: %s',
    async (parameters) => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch')
      const response = await search(
        new Request(`https://vault.example/api/tmdb/search?${parameters}`),
      )
      expect(response.status).toBe(400)
      expect(fetchSpy).not.toHaveBeenCalled()
      fetchSpy.mockRestore()
    },
  )
})
