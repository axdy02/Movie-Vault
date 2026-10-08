'use client'

import { useId, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Feedback, PendingIcon } from '@/components/ui/feedback'
import { MovieCard } from '@/components/movie/movie-card'
import { AddMovieButton } from '@/components/movie/add-movie-button'
import { useDiscoverySearch } from '@/features/search/use-discovery-search'
import { CollectionMembershipButton } from './membership-button'
import type { CollectionData, VaultData } from '@/types/domain'

export function CollectionMoviePicker({
  collection,
  vault,
}: {
  collection: CollectionData
  vault: VaultData
}) {
  const id = useId()
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState(false)
  const search = useDiscoverySearch(open ? query : '', vault, page)
  const saved = (query.trim() ? search.saved : vault.movies).filter(
    (movie) => !collection.movieIds.includes(movie.id),
  )
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus size={16} />
          Add films
        </Button>
      </DialogTrigger>
      <DialogContent className="dialog-wide">
        <DialogTitle>Add films to {collection.name}</DialogTitle>
        <DialogDescription>
          Choose a saved film or discover a movie to save directly into this
          collection.
        </DialogDescription>
        <div className="field collection-picker-search">
          <label htmlFor={id}>Search movies, actors, directors…</label>
          <div className="search-input-wrap">
            <Search size={18} />
            <input
              className="search-input"
              id={id}
              type="search"
              maxLength={120}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setPage(1)
              }}
              placeholder="Search your vault and TMDB"
            />
          </div>
        </div>
        {saved.length > 0 && (
          <section className="collection-picker-section">
            <h3>From your vault</h3>
            <div className="collection-picker-grid">
              {saved.slice(0, 24).map((movie) => (
                <div key={movie.id}>
                  <MovieCard movie={movie} />
                  <CollectionMembershipButton
                    collectionId={collection.id}
                    movieId={movie.id}
                  />
                </div>
              ))}
            </div>
            {saved.length > 24 && (
              <p className="field-hint">
                Search to narrow down the other {saved.length - 24} saved films.
              </p>
            )}
          </section>
        )}
        {search.loading && (
          <p role="status" className="collection-search-status">
            <PendingIcon pending />
            Searching TMDB…
          </p>
        )}
        <Feedback message={search.error} error />
        {search.error && (
          <Button variant="ghost" onClick={search.retry}>
            Retry discovery
          </Button>
        )}
        {query.trim().length >= 2 && search.movies.length > 0 && (
          <section className="collection-picker-section">
            <h3>Discover on TMDB</h3>
            <div className="collection-picker-grid">
              {search.movies.map((movie) => (
                <div key={movie.tmdbId}>
                  <MovieCard movie={movie} />
                  <AddMovieButton
                    tmdbId={movie.tmdbId}
                    collectionId={collection.id}
                    compact
                    context={{
                      surface: 'collection_editor',
                      query: query.trim(),
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="pagination">
              <Button
                variant="ghost"
                disabled={page === 1 || search.loading}
                onClick={() => setPage((value) => value - 1)}
              >
                Previous
              </Button>
              <span>
                Page {page} of {search.totalPages}
              </span>
              <Button
                variant="ghost"
                disabled={page >= search.totalPages || search.loading}
                onClick={() => setPage((value) => value + 1)}
              >
                Next
              </Button>
            </div>
          </section>
        )}
        {!search.loading &&
          !search.error &&
          saved.length === 0 &&
          search.movies.length === 0 && (
            <EmptyState
              compact
              title={
                query.trim() ? 'No matching films' : 'Ready for the first film'
              }
              description={
                query.trim()
                  ? 'Try another title or a person’s name.'
                  : 'Search TMDB above to discover a film for this collection.'
              }
            />
          )}
      </DialogContent>
    </Dialog>
  )
}
