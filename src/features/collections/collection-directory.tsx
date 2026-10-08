'use client'

import { useId, useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { CollectionCard } from '@/components/collections/collection-card'
import { EmptyState } from '@/components/ui/empty-state'
import type { CollectionData, LibraryMovie } from '@/types/domain'
import {
  buildCollectionDirectory,
  collectionDirectorySortOptions,
  parseCollectionDirectorySort,
  sortCollectionDirectory,
} from '@/features/discovery/directory-model'

export function CollectionDirectory({
  collections,
  movies,
  canEdit = false,
}: {
  collections: CollectionData[]
  movies: LibraryMovie[]
  canEdit?: boolean
}) {
  const params = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const id = useId()
  const sort = parseCollectionDirectorySort(params.get('sort'))
  const entries = useMemo(
    () => buildCollectionDirectory(collections, movies),
    [collections, movies],
  )
  const shelves = sortCollectionDirectory(entries, sort)

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
            aria-label="Sort collections"
            className="control-select"
            value={sort}
            onChange={(event) => changeSort(event.target.value)}
          >
            {collectionDirectorySortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="result-count" aria-live="polite">
        <strong>{shelves.length}</strong>{' '}
        {shelves.length === 1 ? 'collection' : 'collections'} in the vault
        {sort === 'rating-desc' && ' · Ranked by average TMDB rating'}
        {sort === 'watched-desc' && ' · Films watched by either member'}
      </p>
      {shelves.length ? (
        <div className="collections-grid">
          {shelves.map(({ collection, movies }) => (
            <CollectionCard
              key={collection.id}
              collection={collection}
              movies={movies}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="The shelves are open"
          description={
            canEdit
              ? 'Create a collection, then fill it with films from your vault or TMDB.'
              : 'Collections will appear here as the members curate their films.'
          }
        />
      )}
    </>
  )
}
