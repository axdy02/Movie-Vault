import Image from 'next/image'
import Link from 'next/link'
import { UserRound } from 'lucide-react'
import { personHref } from '@/lib/utils'
import type { PersonData } from '@/types/domain'

export function PersonCard({
  person,
  savedCount = 0,
  watchedCount = 0,
  role,
}: {
  person: PersonData
  savedCount?: number
  watchedCount?: number
  role?: 'actor' | 'director'
}) {
  return (
    <Link
      href={`${personHref(person)}${role === 'director' || (!role && person.department === 'Directing') ? '?role=director' : ''}`}
      className="person-card"
    >
      <div className="person-portrait">
        {person.profilePath ? (
          <Image
            src={`https://image.tmdb.org/t/p/w185${person.profilePath}`}
            fill
            sizes="56px"
            alt={person.name}
          />
        ) : (
          <UserRound size={23} />
        )}
      </div>
      <h3>{person.name}</h3>
      <p>
        {person.department ?? 'Film'}
        {savedCount ? ` · ${savedCount} saved` : ''}
      </p>
      {savedCount > 0 && (
        <>
          <div
            className="progress-track"
            role="progressbar"
            aria-valuenow={watchedCount}
            aria-valuemin={0}
            aria-valuemax={savedCount}
            aria-label={`${person.name}: ${watchedCount} watched of ${savedCount} saved`}
          >
            <div
              className="progress-fill"
              style={{
                width: `${Math.min(100, (watchedCount / savedCount) * 100)}%`,
              }}
            />
          </div>
          <p>
            {watchedCount} watched · {savedCount} saved
          </p>
        </>
      )}
      {person.knownFor.length > 0 && !savedCount && (
        <p>{person.knownFor.slice(0, 3).join(' · ')}</p>
      )}
    </Link>
  )
}
