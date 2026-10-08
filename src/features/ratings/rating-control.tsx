'use client'

import { useId } from 'react'
import { usePathname } from 'next/navigation'
import { Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Feedback, PendingIcon } from '@/components/ui/feedback'
import { useMutation } from '@/features/library/use-mutation'

export function RatingControl({
  movieId,
  rating,
  watched,
}: {
  movieId: string
  rating: number | null
  watched: boolean
}) {
  const id = useId()
  const pathname = usePathname()
  const mutation = useMutation()
  return (
    <div className="member-form-card">
      <h3>Your rating</h3>
      {!watched && <p>You can rate now, or come back after a watch.</p>}
      <form
        key={rating ?? 'unrated'}
        className="rating-form"
        onSubmit={(event) => {
          event.preventDefault()
          const value = new FormData(event.currentTarget).get('rating')
          mutation.run({
            type: 'rate',
            movieId,
            rating: value === '' ? null : Number(value),
            context: {
              surface: 'movie_detail',
              route: pathname,
              method: 'button',
            },
          })
        }}
      >
        <label className="sr-only" htmlFor={id}>
          Your rating out of 10
        </label>
        <select
          className="control-select"
          id={id}
          name="rating"
          defaultValue={rating ?? ''}
          disabled={mutation.pending}
        >
          <option value="">Unrated</option>
          {Array.from({ length: 20 }, (_, index) => (index + 1) / 2).map(
            (value) => (
              <option key={value} value={value}>
                {value.toFixed(1)} / 10
              </option>
            ),
          )}
        </select>
        <Button
          type="submit"
          variant="secondary"
          size="sm"
          disabled={mutation.pending}
        >
          <PendingIcon pending={mutation.pending} />
          {!mutation.pending && <Star size={13} />}Save rating
        </Button>
      </form>
      <Feedback
        message={mutation.result?.message ?? null}
        error={mutation.result?.ok === false}
      />
    </div>
  )
}
