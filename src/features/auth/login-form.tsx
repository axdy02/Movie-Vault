'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { login } from '@/server/actions/vault.actions'
import type { ActionResult } from '@/types/domain'

export function LoginForm({
  next,
  configured,
}: {
  next: string
  configured: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<ActionResult | null>(null)
  function submit(form: FormData) {
    setResult(null)
    startTransition(async () => {
      try {
        const response = await login(form)
        setResult(response)
        if (response.ok) {
          router.replace(response.redirectTo ?? '/library')
          router.refresh()
        }
      } catch {
        setResult({
          ok: false,
          message: 'Could not connect. Please try again.',
        })
      }
    })
  }
  return (
    <form action={submit} className="form-stack" aria-busy={pending}>
      <input type="hidden" name="next" value={next} />
      <label className="field">
        Email
        <input
          type="email"
          name="email"
          autoComplete="username"
          required
          maxLength={254}
          placeholder="you@example.com"
          disabled={pending}
        />
      </label>
      <label className="field">
        Password
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          maxLength={256}
          placeholder="Your password"
          disabled={pending}
        />
      </label>
      {result && (
        <p
          className={result.ok ? 'feedback-success' : 'feedback-error'}
          role={result.ok ? 'status' : 'alert'}
        >
          {result.message}
        </p>
      )}
      {!configured && (
        <p className="settings-copy" role="status">
          Member login will be available once the vault’s Supabase connection is
          configured.
        </p>
      )}
      <Button type="submit" disabled={pending || !configured}>
        {pending ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <ArrowRight size={16} />
        )}
        {pending ? 'Signing in…' : 'Enter the vault'}
      </Button>
    </form>
  )
}
