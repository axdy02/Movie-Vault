'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { MovieCard } from '@/components/movie/movie-card'
import { AddMovieButton } from '@/components/movie/add-movie-button'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { PAGE_SIZE } from '@/lib/constants'
import type {
  EditorProfile,
  FilmographyMovie,
  LibraryMovie,
  PersonData,
} from '@/types/domain'
import {
  FILMOGRAPHY_SORT_OPTIONS,
  filterFilmography,
  parseFilmographyRole,
  parseFilmographySort,
  sortFilmography,
} from './filmography-filters'

export function Filmography({
  person,
  movies,
  library,
  editor,
}: {
  person: PersonData
  movies: FilmographyMovie[]
  library: LibraryMovie[]
  editor: EditorProfile | null
}) {
  const params = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const role = parseFilmographyRole(params.get('role'), person.department)
  const sort = parseFilmographySort(params.get('sort'))
  const rawPage = Number(params.get('page'))
  const list = filterFilmography(movies, role)
  const savedIds = new Set(library.map((movie) => movie.tmdbId))
  const sorted = sortFilmography(list, sort, savedIds)
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const page = Math.min(
    pages,
    Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1,
  )
  function update(key: string, value: string) {
    const next = new URLSearchParams(params)
    next.delete('page')
    next.set(key, value)
    router.push(`${pathname}?${next}`, { scroll: false })
  }
  function paginate(value: number) {
    const next = new URLSearchParams(params)
    next.set('page', String(value))
    router.push(`${pathname}?${next}`, { scroll: false })
  }
  return (
    <>
      <div className="filmography-toolbar">
        <div className="filmography-tabs">
          {[
            { value: 'actor', label: 'Acting' },
            { value: 'director', label: 'Directing' },
            { value: 'crew', label: 'Other credits' },
          ].map((tab) => (
            <Button
              key={tab.value}
              variant={role === tab.value ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => update('role', tab.value)}
              aria-pressed={role === tab.value}
            >
              {tab.label}
            </Button>
          ))}
        </div>
        <select
          className="control-select"
          aria-label="Sort filmography"
          value={sort}
          onChange={(event) => update('sort', event.target.value)}
        >
          {FILMOGRAPHY_SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <p className="result-count">
        <strong>{sorted.length}</strong>{' '}
        {role === 'director'
          ? 'directing'
          : role === 'actor'
            ? 'acting'
            : 'crew'}{' '}
        credits · Includes cameos and other appearances where listed.
      </p>
      {sorted.length ? (
        <div className="poster-grid">
          {sorted
            .slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
            .map((movie) => {
              const saved = library.find(
                (entry) => entry.tmdbId === movie.tmdbId,
              )
              return (
                <div key={`${movie.creditType}-${movie.tmdbId}`}>
                  <MovieCard
                    movie={saved ?? movie}
                    saved={Boolean(saved)}
                    context={movie.role}
                  />
                  {editor && !saved && (
                    <AddMovieButton
                      tmdbId={movie.tmdbId}
                      compact
                      context={{
                        surface: 'person_filmography',
                        personTmdbId: person.tmdbId,
                      }}
                    />
                  )}
                </div>
              )
            })}
        </div>
      ) : (
        <EmptyState
          title="This part of the story is quiet."
          description="No matching credits are currently listed by TMDB. Try another credit type above."
          compact
        />
      )}
      {pages > 1 && (
        <div className="pagination">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => paginate(page - 1)}
          >
            Previous
          </Button>
          <span>
            {page} of {pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page === pages}
            onClick={() => paginate(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </>
  )
}
