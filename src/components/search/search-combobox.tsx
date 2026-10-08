'use client'

import { useEffect, useId, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Check, Film, Search, UserRound, X } from 'lucide-react'
import { MovieCard } from '@/components/movie/movie-card'
import { AddMovieButton } from '@/components/movie/add-movie-button'
import { PersonCard } from '@/components/people/person-card'
import { SectionHeader } from '@/components/ui/section-header'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { PendingIcon } from '@/components/ui/feedback'
import { useDiscoverySearch } from '@/features/search/use-discovery-search'
import { movieHref, personHref } from '@/lib/utils'
import type { EditorProfile, VaultData } from '@/types/domain'

export function SearchCombobox({
  vault,
  editor = null,
  initialQuery = '',
  full = false,
}: {
  vault: VaultData
  editor?: EditorProfile | null
  initialQuery?: string
  full?: boolean
}) {
  const [query, setQuery] = useState(initialQuery)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [page, setPage] = useState(1)
  const input = useRef<HTMLInputElement>(null)
  const root = useRef<HTMLDivElement>(null)
  const id = useId()
  const router = useRouter()
  const results = useDiscoverySearch(query, vault, page)
  const options = [
    ...results.saved.slice(0, 4).map((movie) => ({
      href: movieHref(movie),
      title: movie.title,
      secondary: `${movie.year ?? 'Year unknown'} · Saved in your vault`,
      image: movie.posterPath,
      person: false,
      saved: true,
      group: 'Saved movies',
    })),
    ...results.people.slice(0, 4).map((person) => ({
      href: personHref(person),
      title: person.name,
      secondary: [person.department, ...person.knownFor.slice(0, 2)]
        .filter(Boolean)
        .join(' · '),
      image: person.profilePath,
      person: true,
      saved: false,
      group: 'People',
    })),
    ...results.movies.slice(0, 5).map((movie) => ({
      href: movieHref(movie),
      title: movie.title,
      secondary: `${movie.year ?? 'Year unknown'}${movie.tmdbRating ? ` · ★ ${movie.tmdbRating.toFixed(1)}` : ''}`,
      image: movie.posterPath,
      person: false,
      saved: false,
      group: 'Global movies',
    })),
  ]

  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      const target = event.target as HTMLElement
      if (
        event.key === '/' &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) &&
        !target.isContentEditable
      ) {
        event.preventDefault()
        input.current?.focus()
        setOpen(true)
      }
    }
    function outside(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', shortcut)
    document.addEventListener('pointerdown', outside)
    return () => {
      document.removeEventListener('keydown', shortcut)
      document.removeEventListener('pointerdown', outside)
    }
  }, [])

  function updateQuery(value: string) {
    setQuery(value)
    setPage(1)
    setActive(-1)
    setOpen(true)
    if (full) {
      const url = new URL(window.location.href)
      if (value) url.searchParams.set('q', value)
      else url.searchParams.delete('q')
      window.history.replaceState(null, '', url)
    }
  }
  const showDropdown = !full && open && query.trim().length > 0
  return (
    <div className="search-box" ref={root}>
      <div className="search-input-wrap">
        <Search size={19} />
        <input
          ref={input}
          className="search-input"
          value={query}
          onChange={(event) => updateQuery(event.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Search movies, actors, directors…"
          aria-label="Search movies, actors, directors"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={showDropdown ? `${id}-results` : undefined}
          aria-autocomplete="list"
          aria-activedescendant={
            showDropdown && active >= 0 ? `${id}-option-${active}` : undefined
          }
          autoComplete="off"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setOpen(false)
              setActive(-1)
            }
            if (!full && event.key === 'ArrowDown') {
              event.preventDefault()
              setOpen(true)
              setActive((value) => Math.min(value + 1, options.length - 1))
            }
            if (!full && event.key === 'ArrowUp') {
              event.preventDefault()
              setActive((value) => Math.max(value - 1, 0))
            }
            if (event.key === 'Enter' && query.trim()) {
              event.preventDefault()
              if (active >= 0 && options[active])
                router.push(options[active].href)
              else if (!full)
                router.push(`/search?q=${encodeURIComponent(query.trim())}`)
              setOpen(false)
            }
          }}
        />
        {query && (
          <button
            className="button button-ghost button-icon"
            type="button"
            aria-label="Clear search"
            onClick={() => {
              updateQuery('')
              input.current?.focus()
            }}
          >
            <X size={16} />
          </button>
        )}
        <kbd className="shortcut">/</kbd>
      </div>
      {showDropdown && (
        <div
          className="search-dropdown"
          id={`${id}-results`}
          role="listbox"
          aria-label="Search results"
        >
          {options.map((option, index) => (
            <div key={option.href}>
              {index === 0 || options[index - 1].group !== option.group ? (
                <div className="search-group-label">{option.group}</div>
              ) : null}
              <button
                id={`${id}-option-${index}`}
                role="option"
                aria-selected={active === index}
                className="search-option"
                onMouseEnter={() => setActive(index)}
                onClick={() => {
                  router.push(option.href)
                  setOpen(false)
                }}
              >
                <span className="search-option-image">
                  {option.image ? (
                    <Image
                      src={`https://image.tmdb.org/t/p/w185${option.image}`}
                      fill
                      sizes="36px"
                      alt=""
                    />
                  ) : option.person ? (
                    <UserRound size={17} />
                  ) : (
                    <Film size={17} />
                  )}
                </span>
                <span className="search-option-text">
                  <strong>{option.title}</strong>
                  <span>{option.secondary || 'Open filmography'}</span>
                </span>
                {option.saved ? (
                  <span className="search-option-label">
                    <Check size={13} />
                  </span>
                ) : (
                  <ArrowRight size={14} className="text-muted" />
                )}
              </button>
            </div>
          ))}
          {results.loading && (
            <p className="search-help" role="status">
              <PendingIcon pending /> Searching TMDB…
            </p>
          )}
          {results.error && (
            <div className="search-error" role="alert">
              {results.error}{' '}
              <button onClick={results.retry} className="text-link">
                Retry
              </button>
            </div>
          )}
          {!results.loading && !results.error && options.length === 0 && (
            <p className="search-help">
              {query.trim().length < 2
                ? 'Type one more character to search beyond your vault.'
                : 'No matches found. Try a different title or person.'}
            </p>
          )}
          <Link
            className="search-option"
            href={`/search?q=${encodeURIComponent(query)}`}
          >
            See all results <ArrowRight size={14} />
          </Link>
        </div>
      )}
      {full && (
        <div aria-live="polite">
          {query.trim() === '' ? (
            <div className="search-result-section">
              <EmptyState
                title="Follow your curiosity."
                description="Find a film you love, or explore the people behind it. Saved titles appear first, then discoveries from TMDB."
                compact
              />
            </div>
          ) : (
            <>
              {results.saved.length > 0 && (
                <section className="search-result-section">
                  <SectionHeader
                    title="Saved in the vault"
                    count={results.saved.length}
                  />
                  <div className="poster-grid">
                    {results.saved.map((movie) => (
                      <MovieCard key={movie.tmdbId} movie={movie} saved />
                    ))}
                  </div>
                </section>
              )}
              {results.people.length > 0 && (
                <section className="search-result-section">
                  <SectionHeader title="People" count={results.people.length} />
                  <div className="search-results-people">
                    {results.people.map((person) => (
                      <PersonCard
                        key={person.tmdbId}
                        person={person}
                        savedCount={
                          vault.people.find(
                            (local) => local.tmdbId === person.tmdbId,
                          )?.movieIds.length ?? 0
                        }
                      />
                    ))}
                  </div>
                </section>
              )}
              {results.movies.length > 0 && (
                <section className="search-result-section">
                  <SectionHeader
                    title="Discover on TMDB"
                    count={results.movies.length}
                    subtitle="Movie metadata and coverage are provided by TMDB."
                  />
                  <div className="poster-grid">
                    {results.movies.map((movie) => (
                      <div key={movie.tmdbId}>
                        <MovieCard movie={movie} />
                        {movie.originalTitle &&
                          movie.originalTitle !== movie.title && (
                            <p className="card-context">
                              {movie.originalTitle}
                            </p>
                          )}
                        {movie.credits.length > 0 && (
                          <p className="card-context">
                            {movie.credits
                              .filter((credit) => credit.type === 'cast')
                              .slice(0, 2)
                              .map((credit) => credit.name)
                              .join(' · ')}
                          </p>
                        )}
                        {editor && (
                          <AddMovieButton
                            tmdbId={movie.tmdbId}
                            compact
                            context={{ surface: 'global_search', query }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}
              {results.loading && (
                <div className="search-result-section">
                  <p className="result-count" role="status">
                    <PendingIcon pending />
                    Finding films and people…
                  </p>
                  <div className="poster-grid">
                    {Array.from({ length: 6 }, (_, index) => (
                      <div key={index} className="skeleton skeleton-poster" />
                    ))}
                  </div>
                </div>
              )}
              {results.error && (
                <div className="data-notice" role="alert">
                  {results.error}
                  <Button size="sm" variant="secondary" onClick={results.retry}>
                    Retry
                  </Button>
                </div>
              )}
              {!results.loading &&
                !results.error &&
                results.saved.length +
                  results.people.length +
                  results.movies.length ===
                  0 && (
                  <div className="search-result-section">
                    <EmptyState
                      title={
                        query.trim().length < 2
                          ? 'A little more to go on.'
                          : 'No matches found.'
                      }
                      description={
                        query.trim().length < 2
                          ? 'Enter at least two characters to discover movies and people on TMDB.'
                          : 'Try another title, a different spelling, or a person’s name.'
                      }
                      compact
                    />
                  </div>
                )}
              {results.totalPages > 1 && (
                <div className="pagination">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1 || results.loading}
                    onClick={() => setPage((value) => value - 1)}
                  >
                    Previous
                  </Button>
                  <span>
                    Page {page} of {results.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= results.totalPages || results.loading}
                    onClick={() => setPage((value) => value + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
