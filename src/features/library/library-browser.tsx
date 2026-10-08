'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { MovieGrid } from '@/components/movie/movie-grid'
import { MovieCard } from '@/components/movie/movie-card'
import { CollectionMembershipButton } from '@/features/collections/membership-button'
import { PAGE_SIZE } from '@/lib/constants'
import { REGIONS, REGION_STORAGE_KEY } from '@/lib/regions'
import type { EditorProfile, VaultData } from '@/types/domain'
import { FilterDialog } from './filter-dialog'
import { RandomPicker } from './random-picker'
import {
  filterMovies,
  parseFilters,
  serializeFilters,
  sortMovies,
  MOVIE_SORT_OPTIONS,
} from './filters'

export function LibraryBrowser({
  vault,
  editor,
  collectionId,
}: {
  vault: VaultData
  editor: EditorProfile | null
  collectionId?: string
}) {
  const params = useSearchParams()
  const filters = parseFilters(new URLSearchParams(params))
  const router = useRouter()
  const pathname = usePathname()
  const effective = {
    ...filters,
    ...(collectionId ? { collection: collectionId } : {}),
  }
  const matched = sortMovies(
    filterMovies(vault.movies, effective, editor?.id),
    effective.sort,
    editor?.id,
  )
  const active = Object.entries(filters).filter(
    ([key, value]) =>
      !['sort', 'page', 'region'].includes(key) &&
      value !== undefined &&
      value !== 'all' &&
      value !== '',
  )
  const pages = Math.max(1, Math.ceil(matched.length / PAGE_SIZE))
  const page = Math.min(pages, filters.page ?? 1)
  const shown = matched.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  useEffect(() => {
    if (params.has('region')) return
    const timer = setTimeout(() => {
      try {
        const preference = localStorage.getItem(REGION_STORAGE_KEY)
        if (
          preference &&
          preference !== 'IN' &&
          REGIONS.some((region) => region.code === preference)
        ) {
          const next = new URLSearchParams(params)
          next.set('region', preference)
          router.replace(`${pathname}?${next}`, { scroll: false })
        }
      } catch {
        /* URL filters remain usable when optional preference storage is unavailable. */
      }
    }, 0)
    return () => clearTimeout(timer)
  }, [params, pathname, router])
  function navigate(next: URLSearchParams) {
    const serialized = next.toString()
    router.push(`${pathname}${serialized ? `?${serialized}` : ''}`, {
      scroll: false,
    })
  }
  function update(key: string, value: string) {
    const next = new URLSearchParams(params)
    next.delete('page')
    if (value) next.set(key, value)
    else next.delete(key)
    navigate(next)
  }
  function describe(key: string, value: unknown): string {
    const val = String(value)
    if (key === 'actor' || key === 'director')
      return (
        vault.people.find((person) => person.tmdbId === Number(val))?.name ??
        val
      )
    if (key === 'genre')
      return (
        vault.movies
          .flatMap((movie) => movie.genres)
          .find((genre) => genre.id === Number(val))?.name ?? val
      )
    if (key === 'collection')
      return (
        vault.collections.find((collection) => collection.id === val)?.name ??
        'Collection'
      )
    if (key === 'addedBy' || key === 'watchedBy')
      return `${key === 'addedBy' ? 'Added' : 'Watched'} by ${vault.editors.find((user) => user.id === val)?.displayName ?? 'member'}`
    if (key === 'status')
      return (
        (
          {
            both: 'Both watched',
            one: 'One watched',
            neither: 'Neither watched',
            watched: 'Watched',
            unwatched: 'Unwatched',
          } as Record<string, string>
        )[val] ?? val
      )
    if (key === 'providers' || key === 'provider') return `Providers: ${val}`
    if (key === 'decade') return `${val}s`
    if (key === 'q') return `“${val}”`
    return `${({ yearMin: 'Year ≥', yearMax: 'Year ≤', runtimeMin: 'Minutes ≥', runtimeMax: 'Minutes ≤', ratingMin: 'TMDB ≥', ratingMax: 'TMDB ≤', personalMin: 'Member ≥', personalMax: 'Member ≤', language: 'Language' } as Record<string, string>)[key] ?? key} ${val}`
  }

  return (
    <>
      <div className="filter-toolbar">
        <form
          key={filters.q ?? ''}
          className="filter-search"
          onSubmit={(event) => {
            event.preventDefault()
            const query = new FormData(event.currentTarget).get('q')
            update('q', typeof query === 'string' ? query : '')
          }}
        >
          <Search size={16} />
          <input
            name="q"
            defaultValue={filters.q ?? ''}
            placeholder="Search saved titles or people…"
            aria-label="Search saved titles or people"
          />
          <button type="submit" className="sr-only">
            Search library
          </button>
        </form>
        <FilterDialog
          vault={vault}
          filters={filters}
          activeCount={active.length}
          onApply={(selected) => {
            if (filters.q) selected.set('q', filters.q)
            if (filters.sort) selected.set('sort', filters.sort)
            navigate(selected)
          }}
        />
        <select
          aria-label="Sort films"
          className="control-select"
          value={filters.sort ?? 'added-desc'}
          onChange={(event) => update('sort', event.target.value)}
        >
          {MOVIE_SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.value === 'personal-desc' && editor
                ? 'Your rating'
                : option.label}
            </option>
          ))}
        </select>
        <RandomPicker candidates={matched} />
      </div>
      {active.length > 0 && (
        <div className="filter-chips">
          {active.map(([key, value]) => (
            <button
              className="filter-chip"
              key={key}
              onClick={() => update(key, '')}
              aria-label={`Remove ${describe(key, value)} filter`}
            >
              {describe(key, value)}
              <X size={12} />
            </button>
          ))}
          <button
            className="filter-chip"
            onClick={() => navigate(new URLSearchParams())}
          >
            Clear all
          </button>
        </div>
      )}
      <p className="result-count">
        <strong>{matched.length}</strong>{' '}
        {matched.length === 1 ? 'film' : 'films'}
        {active.length ? ' matching your filters' : ' in the vault'}
        {page > 1 && ` · Page ${page}`}
      </p>
      {shown.length ? (
        collectionId && editor ? (
          <div className="poster-grid">
            {shown.map((movie) => (
              <div key={movie.id}>
                <MovieCard movie={movie} />
                <CollectionMembershipButton
                  collectionId={collectionId}
                  movieId={movie.id}
                  remove
                />
              </div>
            ))}
          </div>
        ) : (
          <MovieGrid movies={shown} showAddedBy={Boolean(editor)} />
        )
      ) : (
        <>
          <EmptyState
            title={
              vault.movies.length
                ? 'A different cut might help.'
                : 'Every collection starts with one film.'
            }
            description={
              vault.movies.length
                ? 'No films match these filters. Try a broader search, or clear a filter to find your next watch.'
                : editor
                  ? 'Find a favorite through search and add it to the shared vault.'
                  : 'No films have been added yet. You can still search for movies and explore their stories.'
            }
            href={vault.movies.length ? undefined : '/search'}
            action="Discover a film"
          />
          {active.length > 0 && (
            <div className="form-actions" style={{ justifyContent: 'center' }}>
              <Button
                variant="secondary"
                onClick={() => navigate(new URLSearchParams())}
              >
                Clear filters
              </Button>
            </div>
          )}
        </>
      )}
      {pages > 1 && (
        <div className="pagination">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => {
              const next = serializeFilters({ ...filters, page: page - 1 })
              navigate(next)
            }}
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
            onClick={() => {
              const next = serializeFilters({ ...filters, page: page + 1 })
              navigate(next)
            }}
          >
            Next
          </Button>
        </div>
      )}
      {active.some(([key]) => ['provider', 'providers'].includes(key)) && (
        <p className="provider-freshness">
          Provider filtering uses cached availability for{' '}
          {effective.region ?? 'IN'}. Missing listings do not mean a film is
          unavailable everywhere.
        </p>
      )}
      {!editor && (
        <p className="public-notice" style={{ marginTop: 27 }}>
          <span className="status-dot" />
          Browsing is open.{' '}
          <Link href="/login">Members can curate the vault.</Link>
        </p>
      )}
    </>
  )
}
