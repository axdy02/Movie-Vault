'use client'

import { useId } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { MovieCard } from '@/components/movie/movie-card'
import {
  MOVIE_SORT_OPTIONS,
  SORT_OPTIONS,
  sortMovies,
  type MovieSort,
} from '@/features/library/filters'
import type { LibraryMovie } from '@/types/domain'

export function SavedPersonMovies({
  movies,
  personTmdbId,
  director = false,
  currentUserId,
}: {
  movies: LibraryMovie[]
  personTmdbId: number
  director?: boolean
  currentUserId?: string
}) {
  const id = useId()
  const params = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const requestedSort = params.get('savedSort')
  const sort: MovieSort = SORT_OPTIONS.includes(requestedSort as MovieSort)
    ? (requestedSort as MovieSort)
    : 'added-desc'
  const sorted = sortMovies(movies, sort, currentUserId)

  return (
    <>
      <div className="filmography-toolbar">
        <label htmlFor={id} className="field-label">
          Sort saved films
        </label>
        <select
          id={id}
          className="control-select"
          value={sort}
          onChange={(event) => {
            const next = new URLSearchParams(params)
            next.delete('savedPage')
            if (event.target.value === 'added-desc') next.delete('savedSort')
            else next.set('savedSort', event.target.value)
            router.push(`${pathname}${next.size ? `?${next}` : ''}`, {
              scroll: false,
            })
          }}
        >
          {MOVIE_SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.value === 'personal-desc' && currentUserId
                ? 'Your rating'
                : option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="poster-grid">
        {sorted.map((movie) => (
          <MovieCard
            key={movie.tmdbId}
            movie={movie}
            context={[
              ...new Set(
                movie.credits
                  .filter(
                    (credit) =>
                      credit.tmdbId === personTmdbId &&
                      (director
                        ? credit.job === 'Director'
                        : credit.type === 'cast'),
                  )
                  .map((credit) => credit.character ?? credit.job ?? 'Cast'),
              ),
            ].join(' · ')}
          />
        ))}
      </div>
    </>
  )
}
