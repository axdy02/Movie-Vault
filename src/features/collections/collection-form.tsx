'use client'

import { useId, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Archive, Pencil, Plus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Feedback, PendingIcon } from '@/components/ui/feedback'
import { useMutation } from '@/features/library/use-mutation'
import type { CollectionData, LibraryMovie } from '@/types/domain'

export function CollectionForm({
  collection,
  movies = [],
}: {
  collection?: CollectionData
  movies?: LibraryMovie[]
}) {
  const id = useId()
  const route = usePathname()
  const [open, setOpen] = useState(false)
  const { run, pending, result } = useMutation()
  const coverChoices = collection
    ? movies.filter(
        (movie) => collection.movieIds.includes(movie.id) && movie.backdropPath,
      )
    : []
  return (
    <div>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!pending) setOpen(next)
        }}
      >
        <DialogTrigger asChild>
          <Button variant={collection ? 'secondary' : 'default'}>
            {collection ? <Pencil size={16} /> : <Plus size={16} />}
            {collection ? 'Edit collection' : 'New collection'}
          </Button>
        </DialogTrigger>
        <DialogContent
          onEscapeKeyDown={(event) => {
            if (pending) event.preventDefault()
          }}
          onPointerDownOutside={(event) => {
            if (pending) event.preventDefault()
          }}
        >
          <DialogTitle>
            {collection ? 'Edit your collection' : 'A new collection'}
          </DialogTitle>
          <DialogDescription>
            Bring films together around a mood, a moment, or a theme.
          </DialogDescription>
          <form
            className="form-stack"
            onSubmit={(event) => {
              event.preventDefault()
              const form = new FormData(event.currentTarget)
              run(
                {
                  type: 'collection',
                  id: collection?.id,
                  name: form.get('name'),
                  description: form.get('description'),
                  coverMovieId: form.get('coverMovieId') || null,
                  context: {
                    surface: 'collection_editor',
                    route,
                    method: 'button',
                  },
                },
                () => setOpen(false),
              )
            }}
          >
            <div className="field">
              <label htmlFor={`${id}-name`}>Collection name</label>
              <input
                id={`${id}-name`}
                name="name"
                required
                minLength={1}
                maxLength={80}
                defaultValue={collection?.name}
                placeholder="Sunday films"
                disabled={pending}
              />
            </div>
            <div className="field">
              <label htmlFor={`${id}-description`}>
                Description <span className="text-muted">(optional)</span>
              </label>
              <textarea
                id={`${id}-description`}
                name="description"
                maxLength={1000}
                defaultValue={collection?.description ?? ''}
                placeholder="What holds these films together?"
                disabled={pending}
              />
            </div>
            <div className="field">
              <label htmlFor={`${id}-cover`}>Cover artwork</label>
              <select
                id={`${id}-cover`}
                name="coverMovieId"
                defaultValue={collection?.coverMovieId ?? ''}
                disabled={pending}
              >
                <option value="">Generated poster collage</option>
                {coverChoices.map((movie) => (
                  <option key={movie.id} value={movie.id}>
                    {movie.title} backdrop
                  </option>
                ))}
              </select>
              <p className="field-hint">
                Add films with backdrop artwork to choose a cover from this
                collection.
              </p>
            </div>
            <Feedback
              message={result?.ok === false ? result.message : null}
              error
            />
            <div className="form-actions">
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                <PendingIcon pending={pending} />
                {pending
                  ? 'Saving…'
                  : collection
                    ? 'Save collection'
                    : 'Create collection'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Feedback message={!open && result?.ok ? result.message : null} />
    </div>
  )
}

export function ArchiveCollection({
  collection,
}: {
  collection: CollectionData
}) {
  const route = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const { run, pending, result } = useMutation()
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) setOpen(next)
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost">
          <Archive size={16} />
          Archive
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Archive {collection.name}?</DialogTitle>
        <DialogDescription>
          This collection will leave the public shelves. Its movie relationships
          and activity history are preserved.
        </DialogDescription>
        <Feedback
          message={result?.message ?? null}
          error={result?.ok === false}
        />
        <div className="form-actions">
          <Button
            variant="ghost"
            disabled={pending}
            onClick={() => setOpen(false)}
          >
            Keep collection
          </Button>
          <Button
            variant="danger"
            disabled={pending}
            onClick={() =>
              run(
                {
                  type: 'collection',
                  id: collection.id,
                  name: collection.name,
                  description: collection.description ?? '',
                  coverMovieId: collection.coverMovieId,
                  archive: true,
                  context: {
                    surface: 'collection_editor',
                    route,
                    method: 'button',
                  },
                },
                () => router.push('/collections'),
              )
            }
          >
            <PendingIcon pending={pending} />
            {pending ? 'Archiving…' : 'Archive collection'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
