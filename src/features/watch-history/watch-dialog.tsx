'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { CalendarDays, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Feedback, PendingIcon } from '@/components/ui/feedback'
import { useMutation } from '@/features/library/use-mutation'

export function WatchDialog({
  movieId,
  eventId,
  rewatch = false,
}: {
  movieId: string
  eventId?: string
  rewatch?: boolean
}) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const mutation = useMutation()
  const correcting = Boolean(eventId)
  const label = correcting
    ? 'Correct date'
    : rewatch
      ? 'Record a rewatch'
      : 'Record a past watch'
  return (
    <div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm">
            {rewatch ? <RotateCcw size={13} /> : <CalendarDays size={13} />}
            {label}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>
            {correcting
              ? 'Give this screening the right date.'
              : 'Another evening, another story.'}
          </DialogTitle>
          <DialogDescription>
            {correcting
              ? 'A correction preserves the original record and creates a replacement in your watch history.'
              : 'Choose when you watched. The viewing date and the time it was recorded are stored separately.'}
          </DialogDescription>
          <form
            className="form-stack"
            onSubmit={(event) => {
              event.preventDefault()
              const value = new FormData(event.currentTarget).get('watchedAt')
              if (typeof value !== 'string' || !value) return
              const date = new Date(value)
              if (!Number.isFinite(date.getTime())) return
              mutation.run(
                {
                  ...(correcting
                    ? {
                        type: 'correct_watch',
                        eventId,
                        watchedAt: date.toISOString(),
                      }
                    : {
                        type: 'watch',
                        movieId,
                        watched: true,
                        rewatch: true,
                        watchedAt: date.toISOString(),
                      }),
                  context: {
                    surface: 'movie_detail',
                    route: pathname,
                    method: 'button',
                  },
                },
                () => setOpen(false),
              )
            }}
          >
            <div className="field">
              <label htmlFor={`watch-date-${eventId ?? movieId}`}>
                Watched date and time
              </label>
              <input
                id={`watch-date-${eventId ?? movieId}`}
                type="datetime-local"
                name="watchedAt"
                required
                disabled={mutation.pending}
              />
              <p className="field-hint">
                Enter the date in your current local timezone.
              </p>
            </div>
            <Feedback
              message={mutation.result?.message ?? null}
              error={mutation.result?.ok === false}
            />
            <div className="form-actions">
              <Button type="submit" disabled={mutation.pending}>
                <PendingIcon pending={mutation.pending} />
                {correcting ? 'Save correction' : 'Record watch'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      {!open && mutation.result?.ok && (
        <Feedback message={mutation.result.message} />
      )}
    </div>
  )
}
