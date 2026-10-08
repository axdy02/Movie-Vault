import Link from 'next/link'
import { ArrowUpRight, Film, Search } from 'lucide-react'
import { Button } from './button'

export function EmptyState({
  title,
  description,
  href,
  action,
  compact = false,
}: {
  title: string
  description: string
  href?: string
  action?: string
  compact?: boolean
}) {
  return (
    <div className={`empty-state ${compact ? 'empty-state-compact' : ''}`}>
      <div className="empty-art" aria-hidden>
        <div className="empty-frame empty-frame-one">
          <Film size={30} strokeWidth={1} />
        </div>
        <div className="empty-frame empty-frame-two">
          <Search size={30} strokeWidth={1} />
        </div>
        <div className="empty-frame empty-frame-three">
          <Film size={30} strokeWidth={1} />
        </div>
      </div>
      <span className="eyebrow">The opening scene</span>
      <h2>{title}</h2>
      <p>{description}</p>
      {href && action && (
        <Button asChild variant="secondary">
          <Link href={href}>
            {action}
            <ArrowUpRight size={16} />
          </Link>
        </Button>
      )}
    </div>
  )
}
