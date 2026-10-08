import type { ActivityEvent } from '@/types/domain'
const verbs: Record<string, string> = {
  'movie.added': 'added',
  'movie.removed': 'removed',
  'movie.restored': 'restored',
  'movie.metadata_refreshed': 'refreshed the metadata for',
  'watch.marked': 'marked as watched:',
  'watch.unmarked': 'marked as unwatched:',
  'watch.event_recorded': 'recorded a watch of',
  'watch.event_corrected': 'corrected a watch date for',
  'rating.set': 'rated',
  'rating.changed': 'changed a rating for',
  'rating.removed': 'removed a rating for',
  'collection.created': 'created the collection',
  'collection.renamed': 'renamed the collection',
  'collection.updated': 'updated the collection',
  'collection.archived': 'archived the collection',
  'collection.movie_added': 'added',
  'collection.movie_removed': 'removed',
  'note.created': 'added a private note to',
  'note.updated': 'updated a private note for',
  'note.deleted': 'removed a private note from',
  'provider.refreshed': 'refreshed streaming availability for',
}
export function formatActivity(event: ActivityEvent) {
  const actor = event.actorName || 'Movie Vault'
  const target = event.movieTitle ?? event.collectionName ?? 'a library item'
  const verb = verbs[event.action] ?? 'updated'
  let text = `${actor} ${verb} ${target}`
  if (event.action === 'collection.movie_added' && event.collectionName)
    text += ` to ${event.collectionName}`
  if (event.action === 'collection.movie_removed' && event.collectionName)
    text += ` from ${event.collectionName}`
  if (
    event.action === 'rating.changed' &&
    typeof event.before?.rating === 'number' &&
    typeof event.after?.rating === 'number'
  )
    text += ` from ${event.before.rating} to ${event.after.rating}`
  if (event.action === 'rating.set' && typeof event.after?.rating === 'number')
    text += ` ${event.after.rating}/10`
  return text
}
