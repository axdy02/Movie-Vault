import type { LibraryMovie } from '@/types/domain'
import { averageRating, watchedAggregate } from '@/lib/utils'

export const SORT_OPTIONS = [
  'added-desc',
  'added-asc',
  'year-desc',
  'year-asc',
  'title-asc',
  'title-desc',
  'rating-desc',
  'popular-desc',
  'runtime-asc',
  'personal-desc',
  'watched-desc',
] as const
export type MovieSort = (typeof SORT_OPTIONS)[number]
export const MOVIE_SORT_OPTIONS: { value: MovieSort; label: string }[] = [
  { value: 'added-desc', label: 'Recently added' },
  { value: 'added-asc', label: 'Oldest added' },
  { value: 'year-desc', label: 'Newest releases' },
  { value: 'year-asc', label: 'Oldest releases' },
  { value: 'title-asc', label: 'Title A–Z' },
  { value: 'title-desc', label: 'Title Z–A' },
  { value: 'rating-desc', label: 'Top rated on TMDB' },
  { value: 'popular-desc', label: 'Most popular on TMDB' },
  { value: 'runtime-asc', label: 'Shortest first' },
  { value: 'personal-desc', label: 'Member rating' },
  { value: 'watched-desc', label: 'Last watched' },
]
export type LibraryFilters = {
  q?: string
  actor?: number
  director?: number
  genre?: number
  yearMin?: number
  yearMax?: number
  decade?: number
  runtimeMin?: number
  runtimeMax?: number
  language?: string
  status?:
    | 'all'
    | 'both'
    | 'one'
    | 'neither'
    | 'userA'
    | 'userB'
    | 'watched'
    | 'unwatched'
  watchedBy?: string
  addedBy?: string
  ratingMin?: number
  ratingMax?: number
  personalMin?: number
  personalMax?: number
  provider?: number
  providers?: number[]
  collection?: string
  region?: string
  sort?: MovieSort
  page?: number
}
export function parseFilters(
  input: URLSearchParams | Record<string, string | string[] | undefined>,
): LibraryFilters {
  const params =
    input instanceof URLSearchParams
      ? input
      : new URLSearchParams(
          Object.entries(input).flatMap(([key, value]) =>
            typeof value === 'string'
              ? [[key, value]]
              : Array.isArray(value)
                ? value.map((item) => [key, item])
                : [],
          ),
        )
  const filters: LibraryFilters = {}
  const numericKeys = [
    'actor',
    'director',
    'genre',
    'yearMin',
    'yearMax',
    'decade',
    'runtimeMin',
    'runtimeMax',
    'ratingMin',
    'ratingMax',
    'personalMin',
    'personalMax',
    'provider',
    'page',
  ] as const
  for (const key of numericKeys) {
    const raw = params.get(key)
    if (raw == null || raw.trim() === '') continue
    const value = Number(raw)
    const rating = [
      'ratingMin',
      'ratingMax',
      'personalMin',
      'personalMax',
    ].includes(key)
    if (
      Number.isFinite(value) &&
      value >= 0 &&
      value <= (rating ? 10 : Number.MAX_SAFE_INTEGER) &&
      (rating || Number.isInteger(value))
    )
      filters[key] = value
  }
  for (const key of [
    'q',
    'language',
    'watchedBy',
    'addedBy',
    'collection',
  ] as const) {
    const value = params.get(key)?.trim().slice(0, 120)
    if (value) filters[key] = value
  }
  const status = params.get('status')
  if (
    status &&
    [
      'all',
      'both',
      'one',
      'neither',
      'userA',
      'userB',
      'watched',
      'unwatched',
    ].includes(status)
  )
    filters.status = status as LibraryFilters['status']
  const sort = params.get('sort')
  if (sort && SORT_OPTIONS.includes(sort as MovieSort))
    filters.sort = sort as MovieSort
  const region = params.get('region')
  if (region && /^[A-Z]{2}$/.test(region)) filters.region = region
  const providers = params
    .get('providers')
    ?.split(',')
    .map(Number)
    .filter((id) => Number.isSafeInteger(id) && id > 0)
  if (providers?.length) filters.providers = [...new Set(providers)]
  if (filters.page === 0) delete filters.page
  return filters
}
export function serializeFilters(filters: LibraryFilters): URLSearchParams {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters))
    if (
      value !== undefined &&
      value !== '' &&
      value !== 'all' &&
      !(key === 'page' && value === 1)
    )
      params.set(key, Array.isArray(value) ? value.join(',') : String(value))
  return params
}
function inRange(value: number | null, min?: number, max?: number) {
  if (min === undefined && max === undefined) return true
  return (
    value !== null &&
    (min === undefined || value >= min) &&
    (max === undefined || value <= max)
  )
}
export function filterMovies(
  movies: LibraryMovie[],
  filters: LibraryFilters,
  currentUserId?: string,
): LibraryMovie[] {
  return movies.filter((movie) => {
    if (!movie.saved) return false
    const query = filters.q?.toLocaleLowerCase()
    if (
      query &&
      ![
        movie.title,
        movie.originalTitle,
        ...movie.credits.map((credit) => credit.name),
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase()
        .includes(query)
    )
      return false
    if (
      filters.actor &&
      !movie.credits.some(
        (credit) => credit.tmdbId === filters.actor && credit.type === 'cast',
      )
    )
      return false
    if (
      filters.director &&
      !movie.credits.some(
        (credit) =>
          credit.tmdbId === filters.director && credit.job === 'Director',
      )
    )
      return false
    if (
      filters.genre &&
      !movie.genres.some((genre) => genre.id === filters.genre)
    )
      return false
    if (
      !inRange(movie.year, filters.yearMin, filters.yearMax) ||
      !inRange(movie.runtime, filters.runtimeMin, filters.runtimeMax) ||
      !inRange(movie.tmdbRating, filters.ratingMin, filters.ratingMax)
    )
      return false
    if (
      filters.decade !== undefined &&
      (movie.year === null ||
        Math.floor(movie.year / 10) * 10 !== filters.decade)
    )
      return false
    if (filters.language && movie.language !== filters.language) return false
    if (filters.addedBy && movie.addedById !== filters.addedBy) return false
    if (filters.collection && !movie.collectionIds.includes(filters.collection))
      return false
    const watched = watchedAggregate(movie.states)
    const ownState = currentUserId
      ? movie.states.find((state) => state.userId === currentUserId)
      : undefined
    if (filters.status === 'both' && watched !== 'both') return false
    if (
      filters.status === 'neither' &&
      movie.states.some((state) => state.watched)
    )
      return false
    if (
      filters.status === 'one' &&
      movie.states.filter((state) => state.watched).length !== 1
    )
      return false
    if (
      (filters.status === 'userA' || filters.status === 'userB') &&
      watched !== filters.status
    )
      return false
    if (
      filters.status === 'watched' &&
      !(currentUserId
        ? ownState?.watched
        : movie.states.some((state) => state.watched))
    )
      return false
    if (
      filters.status === 'unwatched' &&
      (currentUserId
        ? ownState?.watched
        : movie.states.some((state) => state.watched))
    )
      return false
    if (
      filters.watchedBy &&
      !movie.states.some(
        (state) => state.userId === filters.watchedBy && state.watched,
      )
    )
      return false
    const personal = currentUserId
      ? (ownState?.rating ?? null)
      : averageRating(movie.states.map((state) => state.rating))
    if (!inRange(personal, filters.personalMin, filters.personalMax))
      return false
    const providers =
      filters.providers ?? (filters.provider ? [filters.provider] : [])
    if (
      providers.length &&
      (!movie.providers ||
        (filters.region && movie.providers.region !== filters.region) ||
        !Object.values(movie.providers.offers)
          .flat()
          .some((provider) => providers.includes(provider.id)))
    )
      return false
    return true
  })
}
export function sortMovies(
  movies: LibraryMovie[],
  sort: MovieSort = 'added-desc',
  currentUserId?: string,
): LibraryMovie[] {
  const releaseTime = (movie: LibraryMovie) => {
    const date = Date.parse(movie.releaseDate ?? '')
    return Number.isFinite(date)
      ? date
      : movie.year === null
        ? null
        : Date.UTC(movie.year, 0, 1)
  }
  const latestWatch = (movie: LibraryMovie) =>
    Math.max(
      0,
      ...movie.states.map(
        (state) => Date.parse(state.lastWatchedAt ?? '') || 0,
      ),
    )
  const personalRating = (movie: LibraryMovie) =>
    currentUserId
      ? (movie.states.find((state) => state.userId === currentUserId)?.rating ??
        null)
      : averageRating(movie.states.map((state) => state.rating))
  return [...movies].sort((a, b) => {
    switch (sort) {
      case 'title-asc':
        return a.title.localeCompare(b.title) || a.tmdbId - b.tmdbId
      case 'title-desc':
        return b.title.localeCompare(a.title) || a.tmdbId - b.tmdbId
      case 'year-asc':
        return (
          (releaseTime(a) ?? Infinity) - (releaseTime(b) ?? Infinity) ||
          a.tmdbId - b.tmdbId
        )
      case 'year-desc':
        return (
          (releaseTime(b) ?? -Infinity) - (releaseTime(a) ?? -Infinity) ||
          a.tmdbId - b.tmdbId
        )
      case 'rating-desc':
        return (
          (b.tmdbRating ?? -1) - (a.tmdbRating ?? -1) || a.tmdbId - b.tmdbId
        )
      case 'popular-desc':
        return b.popularity - a.popularity || a.tmdbId - b.tmdbId
      case 'runtime-asc':
        return (
          (a.runtime ?? Infinity) - (b.runtime ?? Infinity) ||
          a.tmdbId - b.tmdbId
        )
      case 'personal-desc':
        return (
          (personalRating(b) ?? -1) - (personalRating(a) ?? -1) ||
          a.tmdbId - b.tmdbId
        )
      case 'watched-desc':
        return latestWatch(b) - latestWatch(a) || a.tmdbId - b.tmdbId
      case 'added-asc':
        return (
          Date.parse(a.addedAt) - Date.parse(b.addedAt) || a.tmdbId - b.tmdbId
        )
      default:
        return (
          Date.parse(b.addedAt) - Date.parse(a.addedAt) || a.tmdbId - b.tmdbId
        )
    }
  })
}
// Rejection sampling avoids modulo bias, including when candidate count is not a power of two.
export function pickRandom<T>(
  candidates: T[],
  randomUint32: () => number = () =>
    crypto.getRandomValues(new Uint32Array(1))[0],
): T | null {
  const count = candidates.length
  if (!count) return null
  const bound = Math.floor(0x100000000 / count) * count
  let value: number
  do {
    value = randomUint32()
  } while (value >= bound)
  return candidates[value % count]
}
