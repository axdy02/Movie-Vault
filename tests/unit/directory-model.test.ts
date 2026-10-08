import { describe, expect, it } from 'vitest'
import {
  buildCollectionDirectory,
  buildGenreDirectory,
  collectionDirectorySortOptions,
  genreDirectorySortOptions,
  parseCollectionDirectorySort,
  parseGenreDirectorySort,
  sortCollectionDirectory,
  sortGenreDirectory,
} from '@/features/discovery/directory-model'
import type { CollectionData } from '@/types/domain'
import { movie } from '../fixtures/domain'

function collection(overrides: Partial<CollectionData> = {}): CollectionData {
  return {
    id: 'shelf',
    name: 'Sunday films',
    slug: 'sunday-films',
    description: null,
    pinned: false,
    movieIds: [],
    coverMovieId: null,
    createdAt: '2026-10-08T00:00:00Z',
    ...overrides,
  }
}

const watched = movie().states.map((state) => ({
  ...state,
  watched: true,
  watchCount: 10,
}))
const films = [
  movie({
    id: 'first',
    tmdbId: 1,
    genres: [{ id: 1, name: 'Action' }],
    tmdbRating: 6,
  }),
  movie({
    id: 'second',
    tmdbId: 2,
    genres: [{ id: 1, name: 'Action' }],
    tmdbRating: null,
  }),
  movie({
    id: 'third',
    tmdbId: 3,
    genres: [{ id: 2, name: 'Drama' }],
    tmdbRating: 9,
    states: watched,
  }),
  movie({
    id: 'fourth',
    tmdbId: 4,
    genres: [{ id: 3, name: 'Mystery' }],
    tmdbRating: null,
  }),
]

describe('directory summaries', () => {
  it('accepts only supported URL sort choices and provides defaults', () => {
    expect(parseGenreDirectorySort(null)).toBe('films-desc')
    expect(parseCollectionDirectorySort('invalid')).toBe('pinned')
    for (const option of genreDirectorySortOptions)
      expect(parseGenreDirectorySort(option.value)).toBe(option.value)
    for (const option of collectionDirectorySortOptions)
      expect(parseCollectionDirectorySort(option.value)).toBe(option.value)
  })

  it('derives each genre from distinct active canonical films and averages only present ratings', () => {
    const film = movie({
      id: 'unique',
      tmdbId: 1,
      tmdbRating: 0,
      genres: [
        { id: 1, name: 'Drama' },
        { id: 1, name: 'Drama' },
      ],
      states: watched,
    })
    const entries = buildGenreDirectory([
      film,
      film,
      movie({ tmdbId: 2, tmdbRating: 8, genres: [{ id: 1, name: 'Drama' }] }),
      movie({
        tmdbId: 3,
        tmdbRating: null,
        genres: [{ id: 1, name: 'Drama' }],
      }),
      movie({ tmdbId: 4, saved: false, genres: [{ id: 9, name: 'Removed' }] }),
    ])
    expect(entries).toHaveLength(1)
    expect(entries[0].movies).toHaveLength(3)
    expect(entries[0].averageTmdbRating).toBe(4)
    expect(entries[0].watchedCount).toBe(1)
    expect(film.genres).toHaveLength(2)
  })

  it('deduplicates collection members, ignores removed and missing films, and retains empty shelves', () => {
    const removed = movie({ id: 'removed', tmdbId: 5, saved: false })
    const entries = buildCollectionDirectory(
      [
        collection({
          movieIds: ['first', 'first', 'second', 'removed', 'missing'],
        }),
        collection({ id: 'empty', movieIds: [] }),
      ],
      [...films, films[0], removed],
    )
    expect(entries[0].movies.map((film) => film.id)).toEqual([
      'first',
      'second',
    ])
    expect(entries[0].averageTmdbRating).toBe(6)
    expect(entries[1].movies).toEqual([])
    expect(entries[1].averageTmdbRating).toBeNull()
  })
})

describe('genre rankings', () => {
  const entries = buildGenreDirectory(films)
  it.each([
    ['films-desc', ['Action', 'Drama', 'Mystery']],
    ['rating-desc', ['Drama', 'Action', 'Mystery']],
    ['watched-desc', ['Drama', 'Action', 'Mystery']],
    ['name-asc', ['Action', 'Drama', 'Mystery']],
    ['name-desc', ['Mystery', 'Drama', 'Action']],
  ] as const)(
    'orders %s with name ties and missing ratings last',
    (sort, expected) => {
      expect(
        sortGenreDirectory(entries, sort).map((entry) => entry.genre.name),
      ).toEqual(expected)
      expect(entries.map((entry) => entry.genre.name)).toEqual([
        'Action',
        'Drama',
        'Mystery',
      ])
    },
  )

  it('uses genre IDs for identical names and does not count rewatches after unmarking', () => {
    const entries = buildGenreDirectory([
      movie({
        tmdbId: 2,
        genres: [{ id: 2, name: 'Drama' }],
        states: watched.map((state) => ({ ...state, watched: false })),
      }),
      movie({ tmdbId: 1, genres: [{ id: 1, name: 'Drama' }] }),
    ])
    expect(entries.every((entry) => entry.watchedCount === 0)).toBe(true)
    expect(
      sortGenreDirectory(entries, 'watched-desc').map(
        (entry) => entry.genre.id,
      ),
    ).toEqual([1, 2])
  })
})

describe('collection rankings', () => {
  const entries = buildCollectionDirectory(
    [
      collection({
        id: 'action',
        name: 'Action',
        movieIds: ['first', 'second'],
        createdAt: '2026-10-05T00:00:00Z',
      }),
      collection({
        id: 'mystery',
        name: 'Mystery',
        pinned: true,
        movieIds: ['fourth'],
        createdAt: '2026-10-06T00:00:00Z',
      }),
      collection({
        id: 'drama',
        name: 'Drama',
        pinned: true,
        movieIds: ['third'],
        createdAt: '2026-10-07T00:00:00Z',
      }),
    ],
    films,
  )

  it.each([
    ['pinned', ['Mystery', 'Drama', 'Action']],
    ['films-desc', ['Action', 'Drama', 'Mystery']],
    ['rating-desc', ['Drama', 'Action', 'Mystery']],
    ['watched-desc', ['Drama', 'Action', 'Mystery']],
    ['created-desc', ['Drama', 'Mystery', 'Action']],
    ['created-asc', ['Action', 'Mystery', 'Drama']],
    ['name-asc', ['Action', 'Drama', 'Mystery']],
    ['name-desc', ['Mystery', 'Drama', 'Action']],
  ] as const)(
    'orders %s and leaves canonical data unchanged',
    (sort, expected) => {
      expect(
        sortCollectionDirectory(entries, sort).map(
          (entry) => entry.collection.name,
        ),
      ).toEqual(expected)
      expect(entries.map((entry) => entry.collection.name)).toEqual([
        'Action',
        'Mystery',
        'Drama',
      ])
    },
  )

  it('breaks tied names with IDs and keeps unknown creation times last in both directions', () => {
    const entries = buildCollectionDirectory(
      [
        collection({ id: 'b', name: 'Same' }),
        collection({ id: 'a', name: 'Same' }),
        collection({ id: 'unknown', name: 'Earlier name', createdAt: '' }),
      ],
      [],
    )
    expect(
      sortCollectionDirectory(entries, 'created-desc').map(
        (entry) => entry.collection.id,
      ),
    ).toEqual(['a', 'b', 'unknown'])
    expect(
      sortCollectionDirectory(entries, 'created-asc').map(
        (entry) => entry.collection.id,
      ),
    ).toEqual(['a', 'b', 'unknown'])
  })
})
