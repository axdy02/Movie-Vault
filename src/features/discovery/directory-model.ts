import type { CollectionData, Genre, LibraryMovie } from '@/types/domain'

export const genreDirectorySortOptions = [
  { value: 'films-desc', label: 'Most films' },
  { value: 'rating-desc', label: 'Top rated' },
  { value: 'name-asc', label: 'A–Z' },
  { value: 'name-desc', label: 'Z–A' },
  { value: 'watched-desc', label: 'Most watched' },
] as const

export const collectionDirectorySortOptions = [
  { value: 'pinned', label: 'Pinned first' },
  { value: 'films-desc', label: 'Most films' },
  { value: 'rating-desc', label: 'Top rated' },
  { value: 'created-desc', label: 'Recently created' },
  { value: 'created-asc', label: 'Oldest collections' },
  { value: 'name-asc', label: 'A–Z' },
  { value: 'name-desc', label: 'Z–A' },
  { value: 'watched-desc', label: 'Most watched' },
] as const

export type GenreDirectorySort =
  (typeof genreDirectorySortOptions)[number]['value']
export type CollectionDirectorySort =
  (typeof collectionDirectorySortOptions)[number]['value']

type MovieSummary = {
  movies: LibraryMovie[]
  averageTmdbRating: number | null
  watchedCount: number
}
export type GenreDirectoryEntry = MovieSummary & { genre: Genre }
export type CollectionDirectoryEntry = MovieSummary & {
  collection: CollectionData
}

export function parseGenreDirectorySort(
  value: string | null,
): GenreDirectorySort {
  return (
    genreDirectorySortOptions.find((option) => option.value === value)?.value ??
    'films-desc'
  )
}

export function parseCollectionDirectorySort(
  value: string | null,
): CollectionDirectorySort {
  return (
    collectionDirectorySortOptions.find((option) => option.value === value)
      ?.value ?? 'pinned'
  )
}

function canonicalMovies(movies: LibraryMovie[]): LibraryMovie[] {
  const canonical = new Map<number, LibraryMovie>()
  for (const movie of movies) {
    if (movie.saved && !canonical.has(movie.tmdbId))
      canonical.set(movie.tmdbId, movie)
  }
  return [...canonical.values()]
}

function summarize(movies: LibraryMovie[]): MovieSummary {
  const ratings = movies.flatMap((movie) =>
    movie.tmdbRating === null ? [] : [movie.tmdbRating],
  )
  return {
    movies,
    averageTmdbRating: ratings.length
      ? ratings.reduce((total, rating) => total + rating, 0) / ratings.length
      : null,
    watchedCount: movies.filter((movie) =>
      movie.states.some((state) => state.watched),
    ).length,
  }
}

export function buildGenreDirectory(
  movies: LibraryMovie[],
): GenreDirectoryEntry[] {
  const genres = new Map<number, { genre: Genre; movies: LibraryMovie[] }>()
  for (const movie of canonicalMovies(movies)) {
    const assigned = new Set<number>()
    for (const genre of movie.genres) {
      if (assigned.has(genre.id)) continue
      assigned.add(genre.id)
      const entry = genres.get(genre.id) ?? { genre, movies: [] }
      entry.movies.push(movie)
      genres.set(genre.id, entry)
    }
  }
  return [...genres.values()].map(({ genre, movies }) => ({
    genre,
    ...summarize(movies),
  }))
}

export function buildCollectionDirectory(
  collections: CollectionData[],
  movies: LibraryMovie[],
): CollectionDirectoryEntry[] {
  const byId = new Map(
    canonicalMovies(movies).map((movie) => [movie.id, movie]),
  )
  return collections.map((collection) => ({
    collection,
    ...summarize(
      [...new Set(collection.movieIds)].flatMap((id) => {
        const movie = byId.get(id)
        return movie ? [movie] : []
      }),
    ),
  }))
}

function compareNames(a: string, b: string) {
  return a.localeCompare(b, 'en', { sensitivity: 'base', numeric: true })
}

function compareSummary(
  a: MovieSummary,
  b: MovieSummary,
  sort: GenreDirectorySort | CollectionDirectorySort,
) {
  if (sort === 'films-desc') return b.movies.length - a.movies.length
  if (sort === 'rating-desc')
    return (b.averageTmdbRating ?? -1) - (a.averageTmdbRating ?? -1)
  if (sort === 'watched-desc') return b.watchedCount - a.watchedCount
  return 0
}

export function sortGenreDirectory(
  entries: GenreDirectoryEntry[],
  sort: GenreDirectorySort,
): GenreDirectoryEntry[] {
  return [...entries].sort((a, b) => {
    const alphabetical = compareNames(a.genre.name, b.genre.name)
    return (
      compareSummary(a, b, sort) ||
      (sort === 'name-desc' ? -alphabetical : alphabetical) ||
      a.genre.id - b.genre.id
    )
  })
}

export function sortCollectionDirectory(
  entries: CollectionDirectoryEntry[],
  sort: CollectionDirectorySort,
): CollectionDirectoryEntry[] {
  const positions = new Map(entries.map((entry, index) => [entry, index]))
  return [...entries].sort((a, b) => {
    // The public query already orders each pinned group by recent use.
    if (sort === 'pinned')
      return (
        Number(b.collection.pinned) - Number(a.collection.pinned) ||
        positions.get(a)! - positions.get(b)!
      )
    const aDate = Date.parse(a.collection.createdAt)
    const bDate = Date.parse(b.collection.createdAt)
    const chronological =
      sort === 'created-desc' || sort === 'created-asc'
        ? !Number.isFinite(aDate)
          ? Number.isFinite(bDate)
            ? 1
            : 0
          : !Number.isFinite(bDate)
            ? -1
            : sort === 'created-desc'
              ? bDate - aDate
              : aDate - bDate
        : 0
    const alphabetical = compareNames(a.collection.name, b.collection.name)
    return (
      chronological ||
      compareSummary(a, b, sort) ||
      (sort === 'name-desc' ? -alphabetical : alphabetical) ||
      a.collection.id.localeCompare(b.collection.id)
    )
  })
}
