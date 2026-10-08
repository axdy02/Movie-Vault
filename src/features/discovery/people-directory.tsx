'use client'

import Link from 'next/link'
import { useId } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { DataNotice } from '@/components/layout/data-notice'
import { PersonCard } from '@/components/people/person-card'
import type { VaultData } from '@/types/domain'
import {
  derivePeopleDirectory,
  parsePeopleDirectoryParams,
  type PeopleSort,
} from './people-directory-model'

const sortOptions: { value: PeopleSort; label: string }[] = [
  { value: 'films-desc', label: 'Most films' },
  { value: 'leads-desc', label: 'Most lead roles (top 5 billed)' },
  { value: 'rating-desc', label: 'Top-rated films' },
  { value: 'name-asc', label: 'Name A–Z' },
  { value: 'name-desc', label: 'Name Z–A' },
  { value: 'watched-desc', label: 'Most watched films' },
]

export function PeopleDirectory({
  vault,
  directors = false,
}: {
  vault: VaultData
  directors?: boolean
}) {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const id = useId()
  const options = parsePeopleDirectoryParams(
    new URLSearchParams(params),
    directors,
  )
  const people = derivePeopleDirectory(vault, options)
  const filtered = options.cast !== 'all' || options.q !== ''
  function update(key: string, value: string) {
    const next = new URLSearchParams(params)
    next.delete('page')
    if (
      !value ||
      (key === 'cast' && value === 'all') ||
      (key === 'sort' && value === 'films-desc')
    )
      next.delete(key)
    else next.set(key, value)
    router.push(`${pathname}${next.size ? `?${next}` : ''}`, { scroll: false })
  }
  return (
    <>
      <PageHeader
        eyebrow={
          directors
            ? 'The vision behind the frame'
            : 'Familiar faces. New discoveries.'
        }
        title={directors ? 'The directors.' : 'The actors.'}
        description={
          directors
            ? 'Explore the storytellers shaping our collection, and the films they have yet to bring us.'
            : 'Follow your favorite performers through the vault and into their wider filmographies.'
        }
      >
        <Button asChild variant="secondary">
          <Link href="/search">
            <Search size={15} />
            Find a {directors ? 'director' : 'person'}
          </Link>
        </Button>
      </PageHeader>
      <DataNotice vault={vault} />
      <div className="filter-toolbar directory-toolbar">
        <form
          className="filter-search"
          key={options.q}
          onSubmit={(event) => {
            event.preventDefault()
            const query = new FormData(event.currentTarget).get('q')
            update(
              'q',
              typeof query === 'string' ? query.trim().slice(0, 120) : '',
            )
          }}
        >
          <Search size={16} />
          <input
            name="q"
            defaultValue={options.q}
            placeholder={`Search ${directors ? 'directors' : 'actors'}…`}
            aria-label={`Search ${directors ? 'directors' : 'actors'}`}
          />
          <Button type="submit" variant="ghost" size="sm">
            Search
          </Button>
        </form>
        {!directors && (
          <div className="field">
            <label htmlFor={`${id}-cast`}>Cast positions</label>
            <select
              id={`${id}-cast`}
              className="control-select"
              value={options.cast}
              onChange={(event) => update('cast', event.target.value)}
            >
              <option value="all">All cast</option>
              <option value="lead">Lead cast · top 5 billed</option>
              <option value="top-3">Top 3 billed</option>
              <option value="supporting">Supporting cast · billed 6+</option>
            </select>
          </div>
        )}
        <div className="field">
          <label htmlFor={`${id}-sort`}>Sort by</label>
          <select
            id={`${id}-sort`}
            className="control-select"
            value={options.sort}
            onChange={(event) => update('sort', event.target.value)}
          >
            {sortOptions
              .filter((option) => !directors || option.value !== 'leads-desc')
              .map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
          </select>
        </div>
      </div>
      {!directors && (
        <p className="field-hint" style={{ marginBottom: 20 }}>
          Cast groups use TMDB billing order: lead cast means the first five
          positions; supporting cast starts at the sixth. Unlisted positions
          appear only under All cast. Counts reflect the matching saved films.
        </p>
      )}
      {filtered && (
        <div className="filter-chips">
          <button
            className="filter-chip"
            onClick={() => {
              const next = new URLSearchParams(params)
              next.delete('cast')
              next.delete('q')
              next.delete('page')
              router.push(`${pathname}${next.size ? `?${next}` : ''}`, {
                scroll: false,
              })
            }}
          >
            Clear filters
            <X size={12} />
          </button>
        </div>
      )}
      {people.length ? (
        <>
          <p className="result-count">
            <strong>{people.length}</strong>{' '}
            {directors ? 'directors' : 'actors'}{' '}
            {filtered ? 'matching your filters' : 'in the vault'}
          </p>
          <div className="people-grid">
            {people.map(
              ({
                person,
                filmCount,
                leadCount,
                watchedCount,
                averageTmdbRating,
              }) => (
                <div key={person.tmdbId}>
                  <PersonCard
                    person={person}
                    role={directors ? 'director' : 'actor'}
                    savedCount={filmCount}
                    watchedCount={watchedCount}
                  />
                  <p className="card-context">
                    {!directors &&
                      `${leadCount} top-5 billed ${leadCount === 1 ? 'film' : 'films'} · `}
                    {averageTmdbRating === null
                      ? 'TMDB ratings unlisted'
                      : `Average film rating ${averageTmdbRating.toFixed(1)} · TMDB`}
                  </p>
                </div>
              ),
            )}
          </div>
        </>
      ) : (
        <EmptyState
          title={
            filtered
              ? 'A broader view might help.'
              : directors
                ? 'A great film begins with a vision.'
                : 'A great performance stays with you.'
          }
          description={
            filtered
              ? 'No people match these cast positions or this name. Clear the filters to explore everyone in the vault.'
              : `${directors ? 'Directors' : 'Actors'} will appear automatically as films join the vault. Search for someone you love to explore their work now.`
          }
          href={filtered ? undefined : '/search'}
          action={`Discover a ${directors ? 'director' : 'performer'}`}
        />
      )}
    </>
  )
}
