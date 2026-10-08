'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useId, useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ArrowUpRight } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import type { LibraryMovie } from '@/types/domain'
import {
  buildGenreDirectory,
  genreDirectorySortOptions,
  parseGenreDirectorySort,
  sortGenreDirectory,
} from './directory-model'

export function GenreDirectory({ movies }: { movies: LibraryMovie[] }) {
  const params = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const id = useId()
  const sort = parseGenreDirectorySort(params.get('sort'))
  const entries = useMemo(() => buildGenreDirectory(movies), [movies])
  const genres = sortGenreDirectory(entries, sort)

  function changeSort(value: string) {
    const next = new URLSearchParams(params)
    next.set('sort', value)
    next.delete('page')
    router.push(`${pathname}?${next}`, { scroll: false })
  }

  return (
    <>
      <div className="filter-toolbar directory-toolbar">
        <div className="field">
          <label htmlFor={`${id}-sort`}>Sort by</label>
          <select
            id={`${id}-sort`}
            aria-label="Sort genres"
            className="control-select"
            value={sort}
            onChange={(event) => changeSort(event.target.value)}
          >
            {genreDirectorySortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="result-count" aria-live="polite">
        <strong>{genres.length}</strong>{' '}
        {genres.length === 1 ? 'genre' : 'genres'} in the vault
        {sort === 'rating-desc' && ' · Ranked by average TMDB rating'}
        {sort === 'watched-desc' && ' · Films watched by either member'}
      </p>
      {genres.length ? (
        <div className="genre-grid">
          {genres.map(({ genre, movies, averageTmdbRating, watchedCount }) => {
            const art = movies.find((movie) => movie.backdropPath)
            return (
              <Link
                key={genre.id}
                href={`/library?genre=${genre.id}`}
                className="genre-card"
              >
                {art?.backdropPath && (
                  <Image
                    src={`https://image.tmdb.org/t/p/w780${art.backdropPath}`}
                    fill
                    sizes="(max-width: 767px) 45vw, 25vw"
                    alt=""
                  />
                )}
                <div>
                  <h2>{genre.name}</h2>
                  <p>
                    {movies.length} {movies.length === 1 ? 'film' : 'films'}
                    {sort === 'rating-desc' &&
                      averageTmdbRating !== null &&
                      ` · ${averageTmdbRating.toFixed(1)}/10`}
                    {sort === 'watched-desc' && ` · ${watchedCount} watched`}
                    <ArrowUpRight
                      size={13}
                      style={{ display: 'inline-block', marginLeft: 10 }}
                    />
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <EmptyState
          title="There’s a story for every mood."
          description="As films are saved, their genres will gather here automatically. Discover a film to find something that feels right."
          href="/search"
          action="Explore movies"
        />
      )}
    </>
  )
}
