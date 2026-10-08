import type {
  Credit,
  LibraryMovie,
  LibraryPerson,
  VaultData,
} from '@/types/domain'

export const CAST_FILTERS = ['all', 'lead', 'top-3', 'supporting'] as const
export type CastFilter = (typeof CAST_FILTERS)[number]
export const PEOPLE_SORTS = [
  'films-desc',
  'leads-desc',
  'rating-desc',
  'name-asc',
  'name-desc',
  'watched-desc',
] as const
export type PeopleSort = (typeof PEOPLE_SORTS)[number]
export type PeopleDirectoryOptions = {
  directors?: boolean
  cast?: CastFilter
  sort?: PeopleSort
  q?: string
}
export type PeopleDirectoryEntry = {
  person: LibraryPerson
  movies: LibraryMovie[]
  filmCount: number
  leadCount: number
  watchedCount: number
  averageTmdbRating: number | null
}

function knownBilling(order: number | null): order is number {
  return order !== null && Number.isInteger(order) && order >= 0
}

function matchesCast(credit: Credit, filter: CastFilter) {
  if (credit.type !== 'cast') return false
  if (filter === 'all') return true
  if (!knownBilling(credit.order)) return false
  if (filter === 'lead') return credit.order < 5
  if (filter === 'top-3') return credit.order < 3
  return credit.order >= 5
}

export function parsePeopleDirectoryParams(
  params: URLSearchParams,
  directors = false,
): Required<PeopleDirectoryOptions> {
  const requestedCast = params.get('cast')
  const requestedSort = params.get('sort')
  const cast =
    !directors && CAST_FILTERS.includes(requestedCast as CastFilter)
      ? (requestedCast as CastFilter)
      : 'all'
  const sort =
    PEOPLE_SORTS.includes(requestedSort as PeopleSort) &&
    !(directors && requestedSort === 'leads-desc')
      ? (requestedSort as PeopleSort)
      : 'films-desc'
  return {
    directors,
    cast,
    sort,
    q: (params.get('q') ?? '').trim().slice(0, 120),
  }
}

export function derivePeopleDirectory(
  vault: Pick<VaultData, 'movies' | 'people'>,
  options: PeopleDirectoryOptions = {},
): PeopleDirectoryEntry[] {
  const directors = options.directors ?? false
  const cast = options.cast ?? 'all'
  const sort = options.sort ?? 'films-desc'
  const query = options.q?.trim().toLocaleLowerCase() ?? ''
  const people = new Map(vault.people.map((person) => [person.tmdbId, person]))
  const entries = new Map<number, PeopleDirectoryEntry>()
  const seenMovies = new Set<number>()

  for (const movie of vault.movies) {
    if (!movie.saved || seenMovies.has(movie.tmdbId)) continue
    seenMovies.add(movie.tmdbId)
    const matchingPeople = new Set(
      movie.credits
        .filter((credit) =>
          directors
            ? credit.type === 'crew' && credit.job === 'Director'
            : matchesCast(credit, cast),
        )
        .map((credit) => credit.tmdbId),
    )
    for (const tmdbId of matchingPeople) {
      const person = people.get(tmdbId)
      if (
        !person ||
        (query && !person.name.toLocaleLowerCase().includes(query))
      )
        continue
      const entry = entries.get(tmdbId) ?? {
        person,
        movies: [],
        filmCount: 0,
        leadCount: 0,
        watchedCount: 0,
        averageTmdbRating: null,
      }
      entry.movies.push(movie)
      entry.filmCount += 1
      if (
        !directors &&
        movie.credits.some(
          (credit) => credit.tmdbId === tmdbId && matchesCast(credit, 'lead'),
        )
      )
        entry.leadCount += 1
      if (movie.states.some((state) => state.watched)) entry.watchedCount += 1
      entries.set(tmdbId, entry)
    }
  }

  for (const entry of entries.values()) {
    const ratings = entry.movies
      .map((movie) => movie.tmdbRating)
      .filter(
        (rating): rating is number =>
          rating !== null && Number.isFinite(rating),
      )
    entry.averageTmdbRating = ratings.length
      ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
      : null
  }

  const tieBreak = (a: PeopleDirectoryEntry, b: PeopleDirectoryEntry) =>
    a.person.name.localeCompare(b.person.name, 'en', { sensitivity: 'base' }) ||
    a.person.tmdbId - b.person.tmdbId
  return [...entries.values()].sort((a, b) => {
    if (sort === 'name-asc') return tieBreak(a, b)
    if (sort === 'name-desc')
      return (
        b.person.name.localeCompare(a.person.name, 'en', {
          sensitivity: 'base',
        }) || a.person.tmdbId - b.person.tmdbId
      )
    const difference =
      sort === 'leads-desc'
        ? b.leadCount - a.leadCount
        : sort === 'rating-desc'
          ? (b.averageTmdbRating ?? -1) - (a.averageTmdbRating ?? -1)
          : sort === 'watched-desc'
            ? b.watchedCount - a.watchedCount
            : b.filmCount - a.filmCount
    return difference || tieBreak(a, b)
  })
}
