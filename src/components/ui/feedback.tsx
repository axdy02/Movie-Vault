'use client'

import { AlertCircle, CheckCircle2, LoaderCircle } from 'lucide-react'

export function Feedback({
  message,
  error = false,
}: {
  message: string | null
  error?: boolean
}) {
  if (!message) return null
  const Icon = error ? AlertCircle : CheckCircle2
  return (
    <p
      className={`feedback ${error ? 'feedback-error' : 'feedback-success'}`}
      role={error ? 'alert' : 'status'}
    >
      <Icon size={16} />
      <span>{message}</span>
    </p>
  )
}

export function PendingIcon({ pending }: { pending: boolean }) {
  return pending ? (
    <LoaderCircle size={16} className="spinner" aria-hidden />
  ) : null
}
