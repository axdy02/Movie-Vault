import { describe, expect, it } from 'vitest'
import {
  filterFilmography,
  parseFilmographyRole,
  parseFilmographySort,
  sortFilmography,
} from '@/features/discovery/filmography-filters'
import type { FilmographyMovie } from '@/types/domain'
import { movie } from '../fixtures/domain'

function film(overrides: Partial<FilmographyMovie> = {}): FilmographyMovie {
  return { ...movie(), creditType: 'cast', role: 'Cobb', ...overrides }
}
const ids = (movies: FilmographyMovie[]) => movies.map((entry) => entry.tmdbId)

describe('filmography roles and compatible URL values', () => {
  it('preserves existing sort values and validates unknown role/sort input', () => {
    for (const sort of [
      'popular',
      'year',
      'rating',
      'saved',
      'year-asc',
      'title-asc',
      'title-desc',
    ])
      expect(parseFilmographySort(sort)).toBe(sort)
    expect(parseFilmographySort('unknown')).toBe('popular')
    expect(parseFilmographyRole('unknown', 'Directing')).toBe('director')
    expect(parseFilmographyRole(null, 'Acting')).toBe('actor')
    expect(parseFilmographyRole('crew', 'Directing')).toBe('crew')
  })
  it('matches acting credits and exact Director jobs without assistant-director false positives', () => {
    const movies = [
      film({ tmdbId: 1, role: 'Director' }),
      film({ tmdbId: 2, creditType: 'crew', role: 'Producer, Director' }),
      film({ tmdbId: 3, creditType: 'crew', role: 'Assistant Director' }),
      film({ tmdbId: 4, creditType: 'crew', role: 'Co-Director' }),
    ]
    expect(ids(filterFilmography(movies, 'actor'))).toEqual([1])
    expect(ids(filterFilmography(movies, 'director'))).toEqual([2])
    expect(ids(filterFilmography(movies, 'crew'))).toEqual([3, 4])
  })
})

describe('filmography sorting', () => {
  it('uses complete release dates in both directions, falls back to year and keeps unknown dates last', () => {
    const movies = [
      film({ tmdbId: 1, year: 2010, releaseDate: '2010-11-12' }),
      film({ tmdbId: 3, year: 2010, releaseDate: '2010-02-03' }),
      film({ tmdbId: 2, year: 2009, releaseDate: null }),
      film({ tmdbId: 4, year: null, releaseDate: null }),
    ]
    expect(ids(sortFilmography(movies, 'year'))).toEqual([1, 3, 2, 4])
    expect(ids(sortFilmography(movies, 'year-asc'))).toEqual([2, 3, 1, 4])
    expect(ids(movies)).toEqual([1, 3, 2, 4])
  })
  it('sorts titles in both directions and deterministically resolves equal titles', () => {
    const movies = [
      film({ tmdbId: 3, title: 'Zulu' }),
      film({ tmdbId: 2, title: 'Alpha' }),
      film({ tmdbId: 1, title: 'Alpha' }),
    ]
    expect(ids(sortFilmography(movies, 'title-asc'))).toEqual([1, 2, 3])
    expect(ids(sortFilmography(movies, 'title-desc'))).toEqual([3, 1, 2])
  })
  it('sorts popularity, rating and saved membership with stable ties and missing ratings last', () => {
    const movies = [
      film({ tmdbId: 3, title: 'Zulu', popularity: 10, tmdbRating: null }),
      film({ tmdbId: 2, title: 'Beta', popularity: 20, tmdbRating: 8 }),
      film({ tmdbId: 1, title: 'Alpha', popularity: 20, tmdbRating: 8 }),
    ]
    expect(ids(sortFilmography(movies, 'popular'))).toEqual([1, 2, 3])
    expect(ids(sortFilmography(movies, 'rating'))).toEqual([1, 2, 3])
    expect(ids(sortFilmography(movies, 'saved', new Set([3])))).toEqual([
      3, 1, 2,
    ])
  })
})
