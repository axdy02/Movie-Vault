// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDiscoverySearch } from '@/features/search/use-discovery-search'
import type { SearchData, VaultData } from '@/types/domain'
import { movie } from '../fixtures/domain'
const vault: VaultData = {
  configured: true,
  movies: [movie()],
  people: [],
  collections: [],
  events: [],
  editors: [],
}
function results(title: string, tmdbId = 1): SearchData {
  return {
    movies: [movie({ title, tmdbId })],
    people: [],
    page: 1,
    totalPages: 1,
  }
}
beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('fetch', vi.fn())
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})
describe('local-first discovery search', () => {
  it('returns local matches at one character without calling TMDB', async () => {
    const { result } = renderHook(() => useDiscoverySearch('I', vault))
    expect(result.current.saved.map((row) => row.title)).toEqual(['Inception'])
    await act(() => vi.advanceTimersByTimeAsync(500))
    expect(fetch).not.toHaveBeenCalled()
  })
  it('debounces remote search and deduplicates saved films', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(results('Inception', 27205)), {
        status: 200,
      }),
    )
    const { result, rerender } = renderHook(
      ({ query }) => useDiscoverySearch(query, vault),
      { initialProps: { query: 'In' } },
    )
    await act(() => vi.advanceTimersByTimeAsync(200))
    rerender({ query: 'Inc' })
    await act(() => vi.advanceTimersByTimeAsync(299))
    expect(fetch).not.toHaveBeenCalled()
    await act(() => vi.advanceTimersByTimeAsync(1))
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(result.current.saved).toHaveLength(1)
    expect(result.current.movies).toHaveLength(0)
  })
  it('cancels old requests and prevents stale results overwriting new results', async () => {
    let resolveOld!: (response: Response) => void
    vi.mocked(fetch)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveOld = resolve
          }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(results('New query film', 2))),
      )
    const { result, rerender } = renderHook(
      ({ query }) => useDiscoverySearch(query, vault),
      { initialProps: { query: 'old unique query' } },
    )
    await act(() => vi.advanceTimersByTimeAsync(300))
    const signal = vi.mocked(fetch).mock.calls[0][1]?.signal
    rerender({ query: 'new unique query' })
    expect(signal?.aborted).toBe(true)
    await act(() => vi.advanceTimersByTimeAsync(300))
    expect(result.current.movies[0].title).toBe('New query film')
    await act(async () => {
      resolveOld(new Response(JSON.stringify(results('Old query film', 3))))
      await Promise.resolve()
    })
    expect(result.current.movies[0].title).toBe('New query film')
  })
  it('preserves local matches on network failure and allows retry', async () => {
    vi.mocked(fetch)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(
        new Response(JSON.stringify(results('Other film', 11))),
      )
    const { result } = renderHook(() =>
      useDiscoverySearch('inception retry fixture', {
        ...vault,
        movies: [movie({ title: 'Inception retry fixture' })],
      }),
    )
    await act(() => vi.advanceTimersByTimeAsync(300))
    expect(result.current.saved).toHaveLength(1)
    expect(result.current.error).toContain('Your saved matches are still here')
    act(() => result.current.retry())
    await act(() => vi.advanceTimersByTimeAsync(300))
    expect(result.current.error).toBeNull()
    expect(result.current.movies[0].title).toBe('Other film')
  })
  it('rejects malformed third-party proxy responses', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ movies: [{ title: 'bad' }] })),
    )
    const { result } = renderHook(() =>
      useDiscoverySearch('malformed unique query', vault),
    )
    await act(() => vi.advanceTimersByTimeAsync(300))
    expect(result.current.error).not.toBeNull()
    expect(result.current.movies).toEqual([])
  })
})
