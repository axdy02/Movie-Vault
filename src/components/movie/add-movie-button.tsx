'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Check, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Feedback, PendingIcon } from '@/components/ui/feedback'
import { useMutation } from '@/features/library/use-mutation'
import type { MutationContext } from '@/types/domain'

export function AddMovieButton({
  tmdbId,
  saved = false,
  collectionId,
  context,
  compact = false,
}: {
  tmdbId: number
  saved?: boolean
  collectionId?: string
  context?: Partial<MutationContext>
  compact?: boolean
}) {
  const pathname = usePathname()
  const [added, setAdded] = useState(false)
  const { run, pending, result } = useMutation()
  const isSaved = saved || added
  return (
    <div>
      <Button
        className={compact ? 'card-action' : undefined}
        variant={isSaved ? 'secondary' : compact ? 'outline' : 'default'}
        size={compact ? 'sm' : 'default'}
        disabled={pending || isSaved}
        onClick={() =>
          run(
            {
              type: 'add',
              tmdbId,
              collectionId,
              context: {
                surface: 'global_search',
                route: pathname,
                method: 'button',
                ...context,
              },
            },
            () => setAdded(true),
          )
        }
      >
        <PendingIcon pending={pending} />
        {!pending && (isSaved ? <Check size={15} /> : <Plus size={15} />)}
        {pending
          ? 'Adding…'
          : isSaved
            ? 'Saved in vault'
            : collectionId
              ? 'Add to collection'
              : 'Add to vault'}
      </Button>
      <Feedback
        message={result?.message ?? null}
        error={result?.ok === false}
      />
    </div>
  )
}
