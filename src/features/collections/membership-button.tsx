'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Check, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Feedback, PendingIcon } from '@/components/ui/feedback'
import { useMutation } from '@/features/library/use-mutation'

export function CollectionMembershipButton({
  collectionId,
  movieId,
  remove = false,
  label,
}: {
  collectionId: string
  movieId: string
  remove?: boolean
  label?: string
}) {
  const route = usePathname()
  const [settled, setSettled] = useState(false)
  const { pending, result, run } = useMutation()
  return (
    <div className="membership-control">
      <Button
        variant={remove ? 'ghost' : 'secondary'}
        disabled={pending || settled}
        onClick={() =>
          run(
            {
              type: 'membership',
              collectionId,
              movieId,
              remove,
              context: {
                surface: 'collection_editor',
                route,
                method: 'button',
              },
            },
            () => setSettled(true),
          )
        }
      >
        <PendingIcon pending={pending} />
        {!pending &&
          (settled ? (
            <Check size={15} />
          ) : remove ? (
            <X size={15} />
          ) : (
            <Plus size={15} />
          ))}
        {pending
          ? 'Saving…'
          : settled
            ? remove
              ? 'Removed'
              : 'Added'
            : (label ??
              (remove ? 'Remove from collection' : 'Add to collection'))}
      </Button>
      <Feedback
        message={result?.message ?? null}
        error={result?.ok === false}
      />
    </div>
  )
}
