import { describe, expect, it } from 'vitest'
import {
  filterMovies,
  parseFilters,
  pickRandom,
  serializeFilters,
  sortMovies,
} from '@/features/library/filters'
import { editorA, editorB, movie } from '../fixtures/domain'

describe('URL filters', () => {
  it('round-trips combined filters and removes invalid input', () => {
    const filters = {
      actor: 6193,
      genre: 53,
      runtimeMax: 150,
      status: 'neither' as const,
      providers: [8, 9],
      sort: 'year-desc' as const,
      region: 'IN',
    }
    expect(parseFilters(serializeFilters(filters))).toEqual(filters)
    expect(
      parseFilters(
        new URLSearchParams(
          'ratingMin=NaN&runtimeMax=-10&page=0&sort=sql&region=invalid',
        ),
      ),
    ).toEqual({})
  })
  it('combines people/genre/runtime/status/regional provider predicates', () => {
    const candidates = [
      movie(),
      movie({ tmdbId: 1, runtime: 180 }),
      movie({ tmdbId: 2, genres: [] }),
      movie({ tmdbId: 3, providers: null }),
    ]
    expect(
      filterMovies(candidates, {
        genre: 53,
        actor: 6193,
        director: 525,
        runtimeMax: 150,
        provider: 8,
        region: 'IN',
        status: 'neither',
      }).map((row) => row.tmdbId),
    ).toEqual([27205])
    expect(filterMovies(candidates, { provider: 8, region: 'US' })).toEqual([])
  })
  it('searches cast and original titles locally, handles missing ranges', () => {
    expect(filterMovies([movie()], { q: 'Nolan' })).toHaveLength(1)
    expect(
      filterMovies([movie({ runtime: null })], { runtimeMax: 200 }),
    ).toHaveLength(0)
    expect(
      filterMovies([movie({ year: null })], { decade: 2010 }),
    ).toHaveLength(0)
    expect(
      filterMovies([movie()], {
        yearMin: 2009,
        yearMax: 2011,
        decade: 2010,
        language: 'en',
        addedBy: editorA,
      }),
    ).toHaveLength(1)
  })
  it('applies current-user watch and rating state independently', () => {
    const film = movie({
      states: [
        {
          userId: editorA,
          displayName: 'A',
          watched: true,
          rating: 9,
          lastWatchedAt: '2026-10-07T20:00:00Z',
          watchCount: 1,
        },
        {
          userId: editorB,
          displayName: 'B',
          watched: false,
          rating: null,
          lastWatchedAt: null,
          watchCount: 0,
        },
      ],
    })
    expect(filterMovies([film], { status: 'unwatched' }, editorA)).toEqual([])
    expect(filterMovies([film], { status: 'unwatched' }, editorB)).toHaveLength(
      1,
    )
    expect(filterMovies([film], { personalMin: 8 }, editorB)).toEqual([])
    expect(
      filterMovies(
        [film],
        { status: 'one', watchedBy: editorA, personalMin: 8 },
        editorA,
      ),
    ).toHaveLength(1)
  })
  it('excludes removed films and evaluates collection and provider OR criteria', () => {
    expect(filterMovies([movie({ saved: false })], {})).toEqual([])
    expect(filterMovies([movie()], { collection: 'missing' })).toEqual([])
    expect(filterMovies([movie()], { providers: [9, 8] })).toHaveLength(1)
  })
})
describe('sorting and random eligibility', () => {
  it('round-trips popularity sorting and resolves tied films consistently', () => {
    expect(parseFilters(new URLSearchParams('sort=popular-desc')).sort).toBe(
      'popular-desc',
    )
    const movies = [
      movie({ tmdbId: 3, popularity: 10 }),
      movie({ tmdbId: 2, popularity: 100 }),
      movie({ tmdbId: 1, popularity: 100 }),
    ]
    expect(sortMovies(movies, 'popular-desc').map((row) => row.tmdbId)).toEqual(
      [1, 2, 3],
    )
    expect(movies.map((row) => row.tmdbId)).toEqual([3, 2, 1])
  })
  it('sorts missing metadata last and does not mutate input', () => {
    const movies = [
      movie({ tmdbId: 2, year: null, releaseDate: null }),
      movie({ tmdbId: 1, year: 2005, releaseDate: null }),
    ]
    expect(sortMovies(movies, 'year-asc').map((row) => row.tmdbId)).toEqual([
      1, 2,
    ])
    expect(movies[0].tmdbId).toBe(2)
    expect(sortMovies(movies, 'year-desc').map((row) => row.tmdbId)).toEqual([
      1, 2,
    ])
  })
  it('orders releases by full date, falls back to year and leaves unknown dates last', () => {
    const movies = [
      movie({ tmdbId: 1, year: 2010, releaseDate: '2010-11-12' }),
      movie({ tmdbId: 3, year: 2010, releaseDate: '2010-02-03' }),
      movie({ tmdbId: 2, year: 2009, releaseDate: null }),
      movie({ tmdbId: 4, year: null, releaseDate: null }),
    ]
    expect(sortMovies(movies, 'year-desc').map((row) => row.tmdbId)).toEqual([
      1, 3, 2, 4,
    ])
    expect(sortMovies(movies, 'year-asc').map((row) => row.tmdbId)).toEqual([
      2, 3, 1, 4,
    ])
  })
  it('sorts personal ratings in the current editor context', () => {
    const first = movie({ tmdbId: 1 })
    const second = movie({ tmdbId: 2 })
    first.states[0].rating = 7
    first.states[1].rating = 10
    second.states[0].rating = 8
    second.states[1].rating = 1
    expect(
      sortMovies([first, second], 'personal-desc', editorA).map(
        (row) => row.tmdbId,
      ),
    ).toEqual([2, 1])
    expect(
      sortMovies([first, second], 'personal-desc', editorB).map(
        (row) => row.tmdbId,
      ),
    ).toEqual([1, 2])
  })
  it('returns no choice for empty set and rejection-samples overflow for three candidates', () => {
    expect(pickRandom([], () => 0)).toBeNull()
    const values = [0xffffffff, 4]
    expect(pickRandom(['a', 'b', 'c'], () => values.shift()!)).toBe('b')
    expect(values).toHaveLength(0)
  })
  it('chooses only from the filtered set without altering watch state', () => {
    const original = [movie(), movie({ tmdbId: 2, runtime: 190 })]
    expect(
      pickRandom(filterMovies(original, { runtimeMax: 150 }), () => 123)
        ?.tmdbId,
    ).toBe(27205)
    expect(original[0].states.every((state) => !state.watched)).toBe(true)
  })
})
