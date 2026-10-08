'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { mutate } from '@/server/actions/vault.actions'
import type { ActionResult } from '@/types/domain'

export function useMutation() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<ActionResult | null>(null)
  function run(
    input: unknown,
    onSuccess?: (result: Extract<ActionResult, { ok: true }>) => void,
  ) {
    setResult(null)
    startTransition(async () => {
      try {
        const response = await mutate(input)
        setResult(response)
        if (response.ok) {
          onSuccess?.(response)
          router.refresh()
        }
      } catch {
        setResult({
          ok: false,
          message: 'The change could not be saved. Please try again.',
        })
      }
    })
  }
  return { pending, result, run }
}
