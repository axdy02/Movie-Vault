import Link from 'next/link'
import { ArrowLeft, Film } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="error-page">
      <Film size={42} strokeWidth={1} className="text-accent" />
      <p className="eyebrow">404 · A missing scene</p>
      <h1>This one isn’t in the reel.</h1>
      <p>
        The page may have moved, or this title is currently unavailable. There
        is plenty more to explore.
      </p>
      <Button asChild>
        <Link href="/library">
          <ArrowLeft size={16} />
          Explore the library
        </Link>
      </Button>
    </div>
  )
}
