import Image from 'next/image'
import Link from 'next/link'
import { formatActivity } from '@/lib/audit'
import { formatDate, movieHref } from '@/lib/utils'
import type { ActivityEvent, LibraryMovie } from '@/types/domain'

export function ActivityRow({
  event,
  movie,
  detailed = false,
}: {
  event: ActivityEvent
  movie?: LibraryMovie
  detailed?: boolean
}) {
  const initial =
    event.actorName
      .split(' ')
      .map((part) => part[0])
      .slice(0, 2)
      .join('') || 'MV'
  const source = event.sourceSurface?.replaceAll('_', ' ')
  const previousRating =
    typeof event.before?.rating === 'number' ? event.before.rating : null
  const nextRating =
    typeof event.after?.rating === 'number' ? event.after.rating : null
  const previousWatch =
    typeof event.before?.watchedAt === 'string' ? event.before.watchedAt : null
  const nextWatch =
    typeof event.after?.watchedAt === 'string' ? event.after.watchedAt : null
  return (
    <li className="activity-row">
      <span className="avatar activity-avatar" aria-hidden>
        {initial}
      </span>
      <div className="activity-copy">
        <p>{formatActivity(event)}</p>
        <div className="activity-time">
          <time dateTime={event.createdAt}>
            {formatDate(event.createdAt, {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </time>
          {source && <span className="context-tag">{source}</span>}
        </div>
        {detailed && (
          <details className="activity-details">
            <summary>Change details</summary>
            <div className="activity-detail-values">
              {event.sourceRoute && <span>Source: {event.sourceRoute}</span>}
              {event.interactionMethod && (
                <span>
                  Started by: {event.interactionMethod.replaceAll('_', ' ')}
                </span>
              )}
              {event.action.startsWith('rating.') && (
                <span>
                  Rating: {previousRating ?? 'unrated'} →{' '}
                  {nextRating ?? 'unrated'}
                </span>
              )}
              {previousWatch && (
                <span>
                  Previous watch:{' '}
                  {formatDate(previousWatch, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </span>
              )}
              {nextWatch && (
                <span>
                  Watch:{' '}
                  {formatDate(nextWatch, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </span>
              )}
              {event.action.startsWith('note.') && (
                <span>
                  Private note text is excluded from activity records.
                </span>
              )}
            </div>
          </details>
        )}
      </div>
      {movie?.posterPath && (
        <Link
          href={movieHref(movie)}
          className="activity-poster"
          aria-label={`Open ${movie.title}`}
        >
          <Image
            src={`https://image.tmdb.org/t/p/w92${movie.posterPath}`}
            fill
            sizes="34px"
            alt=""
          />
        </Link>
      )}
    </li>
  )
}
