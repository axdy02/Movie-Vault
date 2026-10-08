'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Check, Circle, Layers3, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Feedback, PendingIcon } from '@/components/ui/feedback'
import { RatingControl } from '@/features/ratings/rating-control'
import { useMutation } from '@/features/library/use-mutation'
import { formatDate } from '@/lib/utils'
import type {
  CollectionData,
  EditorProfile,
  LibraryMovie,
  MutationContext,
} from '@/types/domain'
import type { WatchHistoryEvent } from '@/server/queries/vault.queries'
import { WatchDialog } from './watch-dialog'

function MovieCollections({
  movie,
  collections,
}: {
  movie: LibraryMovie
  collections: CollectionData[]
}) {
  const pathname = usePathname()
  const mutation = useMutation()
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Layers3 size={13} />
          Manage collections
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>A place in the collection.</DialogTitle>
        <DialogDescription>
          Add or remove this film from your collections.
        </DialogDescription>
        <div style={{ marginTop: 22 }}>
          {collections.length ? (
            collections.map((collection) => {
              const included = movie.collectionIds.includes(collection.id)
              return (
                <div key={collection.id} className="state-row">
                  <div className="state-row-copy">
                    <strong>{collection.name}</strong>
                    <p>{collection.movieIds.length} films</p>
                  </div>
                  <Button
                    size="sm"
                    variant={included ? 'secondary' : 'outline'}
                    disabled={mutation.pending}
                    onClick={() =>
                      mutation.run({
                        type: 'membership',
                        movieId: movie.id,
                        collectionId: collection.id,
                        remove: included,
                        context: {
                          surface: 'movie_detail',
                          route: pathname,
                          method: 'button',
                        },
                      })
                    }
                  >
                    <PendingIcon pending={mutation.pending} />
                    {included ? <Check size={13} /> : <Plus size={13} />}
                    {included ? 'Remove' : 'Add'}
                  </Button>
                </div>
              )
            })
          ) : (
            <p className="provider-empty">
              Create a collection to give this film some company.
            </p>
          )}
        </div>
        <Feedback
          message={mutation.result?.message ?? null}
          error={mutation.result?.ok === false}
        />
        <div className="form-actions">
          <Button variant="secondary" asChild>
            <Link href="/collections">Open collections</Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function MovieTracking({
  movie,
  editor,
  editors,
  collections,
  history,
  historyError,
  note,
  noteError,
}: {
  movie: LibraryMovie
  editor: EditorProfile
  editors: EditorProfile[]
  collections: CollectionData[]
  history: WatchHistoryEvent[]
  historyError?: string
  note: string | null
  noteError?: string
}) {
  const pathname = usePathname()
  const context: MutationContext = {
    surface: 'movie_detail',
    route: pathname,
    method: 'button',
  }
  const mutation = useMutation()
  const noteMutation = useMutation()
  const [removeOpen, setRemoveOpen] = useState(false)
  const own = movie.states.find((state) => state.userId === editor.id)
  return (
    <>
      <div className="detail-actions">
        <Button
          variant={own?.watched ? 'secondary' : 'default'}
          disabled={mutation.pending}
          onClick={() =>
            mutation.run({
              type: 'watch',
              movieId: movie.id,
              watched: !own?.watched,
              context,
            })
          }
        >
          <PendingIcon pending={mutation.pending} />
          {!mutation.pending &&
            (own?.watched ? <Circle size={15} /> : <Check size={15} />)}
          {own?.watched ? 'Mark unwatched' : 'Mark watched'}
        </Button>
        <MovieCollections movie={movie} collections={collections} />
      </div>
      <Feedback
        message={mutation.result?.message ?? null}
        error={mutation.result?.ok === false}
      />
      <div className="detail-actions">
        <WatchDialog movieId={movie.id} />
        <WatchDialog movieId={movie.id} rewatch />
      </div>
      <RatingControl
        movieId={movie.id}
        rating={own?.rating ?? null}
        watched={own?.watched ?? false}
      />
      <div className="member-form-card">
        <h3>Watch history</h3>
        <p>Unmarking a film keeps every recorded screening.</p>
        {historyError ? (
          <Feedback message={historyError} error />
        ) : history.length ? (
          <div className="watch-list">
            {history.map((event) => (
              <div className="watch-event" key={event.id}>
                <div>
                  <strong>
                    {editors.find((entry) => entry.id === event.userId)
                      ?.displayName ?? 'Member'}{' '}
                    · {formatDate(event.watchedAt)}
                  </strong>
                  <p>
                    Recorded {formatDate(event.createdAt)}
                    {event.correctedFromEventId ? ' · Correction' : ''}
                    {event.voidedAt ? ' · Superseded' : ''}
                  </p>
                </div>
                {event.userId === editor.id && !event.voidedAt && (
                  <WatchDialog movieId={movie.id} eventId={event.id} />
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="provider-empty">No screenings recorded yet.</p>
        )}
      </div>
      <div className="member-form-card">
        <h3>Your private note</h3>
        <p>
          Only you can read this note. Its contents stay out of the public feed.
        </p>
        {noteError ? (
          <Feedback message={noteError} error />
        ) : (
          <form
            className="note-form"
            onSubmit={(event) => {
              event.preventDefault()
              const value = new FormData(event.currentTarget).get('note')
              noteMutation.run({
                type: 'note',
                movieId: movie.id,
                note:
                  typeof value === 'string' && value.trim()
                    ? value.trim()
                    : null,
                context,
              })
            }}
          >
            <div className="field">
              <label className="sr-only" htmlFor={`note-${movie.id}`}>
                Your private note
              </label>
              <textarea
                id={`note-${movie.id}`}
                name="note"
                defaultValue={note ?? ''}
                maxLength={5000}
                placeholder="A thought to keep for later…"
                disabled={noteMutation.pending}
              />
            </div>
            <div className="form-actions">
              <Button
                type="submit"
                variant="secondary"
                size="sm"
                disabled={noteMutation.pending}
              >
                <PendingIcon pending={noteMutation.pending} />
                Save note
              </Button>
            </div>
            <Feedback
              message={noteMutation.result?.message ?? null}
              error={noteMutation.result?.ok === false}
            />
          </form>
        )}
      </div>
      <div className="member-form-card">
        <div className="detail-actions">
          <Button
            variant="ghost"
            size="sm"
            disabled={mutation.pending}
            onClick={() =>
              mutation.run({
                type: 'refresh_metadata',
                movieId: movie.id,
                tmdbId: movie.tmdbId,
                context,
              })
            }
          >
            <RefreshCw size={13} />
            Refresh metadata
          </Button>
          <Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
            <DialogTrigger asChild>
              <Button variant="danger" size="sm">
                <Trash2 size={13} />
                Remove from vault
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogTitle>Remove “{movie.title}”?</DialogTitle>
              <DialogDescription>
                The film will leave the active library and collections. Its
                metadata, ratings, watch history, and activity are preserved so
                it can be restored later.
              </DialogDescription>
              <Feedback
                message={
                  mutation.result?.ok === false ? mutation.result.message : null
                }
                error
              />
              <div className="form-actions">
                <Button
                  variant="secondary"
                  onClick={() => setRemoveOpen(false)}
                >
                  Keep film
                </Button>
                <Button
                  variant="danger"
                  disabled={mutation.pending}
                  onClick={() =>
                    mutation.run(
                      { type: 'remove', movieId: movie.id, context },
                      () => setRemoveOpen(false),
                    )
                  }
                >
                  <PendingIcon pending={mutation.pending} />
                  Remove film
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </>
  )
}
