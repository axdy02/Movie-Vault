import type { FilmographyMovie } from '@/types/domain'

export const FILMOGRAPHY_SORT_OPTIONS = [
  { value: 'popular', label: 'Most popular' },
  { value: 'year', label: 'Latest releases' },
  { value: 'year-asc', label: 'Oldest releases' },
  { value: 'title-asc', label: 'Title A–Z' },
  { value: 'title-desc', label: 'Title Z–A' },
  { value: 'rating', label: 'TMDB rating' },
  { value: 'saved', label: 'Saved first' },
] as const

export type FilmographySort = (typeof FILMOGRAPHY_SORT_OPTIONS)[number]['value']
export type FilmographyRole = 'actor' | 'director' | 'crew'

export function parseFilmographySort(value: string | null): FilmographySort {
  return (
    FILMOGRAPHY_SORT_OPTIONS.find((option) => option.value === value)?.value ??
    'popular'
  )
}

export function parseFilmographyRole(
  value: string | null,
  department: string | null,
): FilmographyRole {
  return value === 'actor' || value === 'director' || value === 'crew'
    ? value
    : department === 'Directing'
      ? 'director'
      : 'actor'
}

export function filterFilmography(
  movies: FilmographyMovie[],
  role: FilmographyRole,
): FilmographyMovie[] {
  return movies.filter((movie) => {
    if (role === 'actor') return movie.creditType === 'cast'
    if (movie.creditType !== 'crew') return false
    const directs = movie.role.split(', ').includes('Director')
    return role === 'director' ? directs : !directs
  })
}

function releaseTime(movie: FilmographyMovie): number | null {
  const date = movie.releaseDate ? Date.parse(movie.releaseDate) : NaN
  if (Number.isFinite(date)) return date
  const year = movie.year === null ? NaN : Date.UTC(movie.year, 0, 1)
  return Number.isFinite(year) ? year : null
}

function compareNumbers(
  a: number | null,
  b: number | null,
  ascending = false,
): number {
  if (a === null) return b === null ? 0 : 1
  if (b === null) return -1
  return ascending ? a - b : b - a
}

function compareTitle(a: FilmographyMovie, b: FilmographyMovie): number {
  return a.title.localeCompare(b.title, 'en', {
    sensitivity: 'base',
    numeric: true,
  })
}

export function sortFilmography(
  movies: FilmographyMovie[],
  sort: FilmographySort = 'popular',
  savedIds: ReadonlySet<number> = new Set(),
): FilmographyMovie[] {
  return [...movies].sort((a, b) => {
    let primary: number
    switch (sort) {
      case 'year':
        primary = compareNumbers(releaseTime(a), releaseTime(b))
        break
      case 'year-asc':
        primary = compareNumbers(releaseTime(a), releaseTime(b), true)
        break
      case 'title-asc':
        primary = compareTitle(a, b)
        break
      case 'title-desc':
        primary = compareTitle(b, a)
        break
      case 'rating':
        primary = compareNumbers(a.tmdbRating, b.tmdbRating)
        break
      case 'saved':
        primary =
          Number(savedIds.has(b.tmdbId)) - Number(savedIds.has(a.tmdbId)) ||
          b.popularity - a.popularity
        break
      default:
        primary = b.popularity - a.popularity
    }
    return (
      primary ||
      compareTitle(a, b) ||
      a.tmdbId - b.tmdbId ||
      a.creditType.localeCompare(b.creditType) ||
      a.role.localeCompare(b.role)
    )
  })
}
