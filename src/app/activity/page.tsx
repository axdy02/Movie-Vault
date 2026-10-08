import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Filter, History } from 'lucide-react'
import { getEditor } from '@/lib/auth/require-editor'
import { getActivity, getVault } from '@/server/queries/vault.queries'
import { ActivityRow } from '@/components/activity/activity-row'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { DataNotice } from '@/components/layout/data-notice'
import { Button } from '@/components/ui/button'
import '@/styles/collections.css'

export const metadata: Metadata = {
  title: 'Activity',
  description: 'The story of the vault, one film and one watch at a time.',
}
const actions = [
  ['movie.added', 'Movie added'],
  ['movie.removed', 'Movie removed'],
  ['movie.restored', 'Movie restored'],
  ['movie.metadata_refreshed', 'Metadata refreshed'],
  ['watch.marked', 'Marked watched'],
  ['watch.unmarked', 'Marked unwatched'],
  ['watch.event_recorded', 'Watch recorded'],
  ['watch.event_corrected', 'Watch date corrected'],
  ['rating.set', 'Rating set'],
  ['rating.changed', 'Rating changed'],
  ['rating.removed', 'Rating removed'],
  ['collection.created', 'Collection created'],
  ['collection.renamed', 'Collection renamed'],
  ['collection.updated', 'Collection updated'],
  ['collection.archived', 'Collection archived'],
  ['collection.movie_added', 'Added to collection'],
  ['collection.movie_removed', 'Removed from collection'],
  ['provider.refreshed', 'Providers refreshed'],
] as const

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const raw = await searchParams
  const value = (key: string) =>
    typeof raw[key] === 'string' ? (raw[key] as string) : ''
  const requested = Number(value('page') || 1)
  const page = Number.isInteger(requested) && requested > 0 ? requested : 1
  const filters = {
    page,
    actorId: value('actorId') || undefined,
    action: value('action') || undefined,
    movieId: value('movieId') || undefined,
    collectionId: value('collectionId') || undefined,
    from: value('from') || undefined,
    to: value('to') || undefined,
  }
  const [vault, editor, activity] = await Promise.all([
    getVault(),
    getEditor(),
    getActivity(filters),
  ])
  const pages = Math.max(1, Math.ceil(activity.total / 50))
  function pageHref(next: number) {
    const params = new URLSearchParams(
      Object.entries(filters).flatMap(([key, input]) =>
        input === undefined || key === 'page' ? [] : [[key, String(input)]],
      ),
    )
    if (next > 1) params.set('page', String(next))
    return `/activity${params.size ? `?${params}` : ''}`
  }
  return (
    <>
      <PageHeader
        eyebrow="A shared history"
        title="Every film has a story."
        description="Who added it. Who watched it. The small decisions that make this vault ours."
      />
      <DataNotice vault={vault} />
      <form action="/activity" method="get" className="activity-filters">
        <div className="field">
          <label htmlFor="activity-member">Member</label>
          <select
            id="activity-member"
            name="actorId"
            defaultValue={filters.actorId ?? ''}
          >
            <option value="">Everyone</option>
            {vault.editors.map((member) => (
              <option key={member.id} value={member.id}>
                {member.displayName}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="activity-action">Action</label>
          <select
            id="activity-action"
            name="action"
            defaultValue={filters.action ?? ''}
          >
            <option value="">All actions</option>
            {actions.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
            {editor && (
              <>
                <option value="note.created">Note created</option>
                <option value="note.updated">Note updated</option>
                <option value="note.deleted">Note removed</option>
              </>
            )}
          </select>
        </div>
        <div className="field">
          <label htmlFor="activity-movie">Film</label>
          <select
            id="activity-movie"
            name="movieId"
            defaultValue={filters.movieId ?? ''}
          >
            <option value="">All films</option>
            {vault.movies.map((movie) => (
              <option key={movie.id} value={movie.id}>
                {movie.title}
              </option>
            ))}
            {filters.movieId &&
              !vault.movies.some((movie) => movie.id === filters.movieId) && (
                <option value={filters.movieId}>Historical film</option>
              )}
          </select>
        </div>
        <div className="field">
          <label htmlFor="activity-collection">Collection</label>
          <select
            id="activity-collection"
            name="collectionId"
            defaultValue={filters.collectionId ?? ''}
          >
            <option value="">All shelves</option>
            {vault.collections.map((collection) => (
              <option key={collection.id} value={collection.id}>
                {collection.name}
              </option>
            ))}
            {filters.collectionId &&
              !vault.collections.some(
                (collection) => collection.id === filters.collectionId,
              ) && (
                <option value={filters.collectionId}>
                  Archived collection
                </option>
              )}
          </select>
        </div>
        <div className="field">
          <label htmlFor="activity-from">From</label>
          <input
            id="activity-from"
            type="date"
            name="from"
            defaultValue={filters.from?.slice(0, 10)}
          />
        </div>
        <div className="field">
          <label htmlFor="activity-to">Through</label>
          <input
            id="activity-to"
            type="date"
            name="to"
            defaultValue={filters.to?.slice(0, 10)}
          />
        </div>
        <div className="activity-filter-actions">
          <Button type="submit" variant="secondary">
            <Filter size={15} />
            Apply filters
          </Button>
          <Button asChild variant="ghost">
            <Link href="/activity">Clear filters</Link>
          </Button>
        </div>
      </form>
      <p className="activity-subtitle">
        <History
          size={13}
          style={{ display: 'inline', verticalAlign: '-2px', marginRight: 6 }}
        />
        {activity.total} {activity.total === 1 ? 'entry' : 'entries'}
        {!editor && ' · Public activity'} · Times in India
      </p>
      {activity.error ? (
        <div className="data-notice" role="alert">
          <p>
            {activity.error}{' '}
            <Link className="text-link" href={pageHref(page)}>
              Try again
            </Link>
          </p>
        </div>
      ) : activity.events.length ? (
        <ol className="activity-timeline">
          {activity.events.map((event) => (
            <ActivityRow
              key={event.id}
              event={event}
              movie={vault.movies.find((movie) => movie.id === event.movieId)}
              detailed={Boolean(editor)}
            />
          ))}
        </ol>
      ) : (
        <EmptyState
          compact
          title="No scenes in this part of the story"
          description="There are no activity entries for these filters. Try a different date, member, or action."
          href="/activity"
          action="Clear filters"
        />
      )}
      {pages > 1 && (
        <nav className="pagination" aria-label="Activity pages">
          {page > 1 && (
            <Button asChild variant="outline">
              <Link href={pageHref(page - 1)}>
                <ArrowLeft size={15} />
                Previous
              </Link>
            </Button>
          )}
          <span>
            Page {page} of {pages}
          </span>
          {page < pages && (
            <Button asChild variant="outline">
              <Link href={pageHref(page + 1)}>
                Next
                <ArrowRight size={15} />
              </Link>
            </Button>
          )}
        </nav>
      )}
    </>
  )
}
