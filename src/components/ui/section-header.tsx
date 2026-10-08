import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

export function SectionHeader({
  title,
  count,
  href,
  label = 'View all',
  subtitle,
}: {
  title: string
  count?: number
  href?: string
  label?: string
  subtitle?: string
}) {
  return (
    <div className="section-header">
      <div>
        <h2>
          {title}
          {count !== undefined && (
            <span className="section-count">{count}</span>
          )}
        </h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {href && (
        <Link href={href} className="text-link">
          {label}
          <ArrowUpRight size={14} />
        </Link>
      )}
    </div>
  )
}
