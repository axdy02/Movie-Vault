'use client'

import Link from 'next/link'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="error-page">
      <p className="eyebrow">A brief intermission</p>
      <h1>Something interrupted the scene.</h1>
      <p>
        The vault could not load this page. Your saved films are safe. Give it
        another try.
      </p>
      <div className="error-page-actions">
        <Button onClick={reset}>
          <RotateCcw size={15} />
          Try again
        </Button>
        <Button variant="secondary" asChild>
          <Link href="/library">Back to library</Link>
        </Button>
      </div>
    </div>
  )
}
