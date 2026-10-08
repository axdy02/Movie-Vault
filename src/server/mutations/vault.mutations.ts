import 'server-only'
import { requireEditor } from '@/lib/auth/require-editor'
import { AppError } from '@/lib/auth/errors'
import {
  fetchMovie,
  fetchMovieCredits,
  fetchWatchProviders,
} from '@/lib/tmdb/client'
import {
  moviePersistencePayload,
  normalizeProviders,
} from '@/lib/tmdb/transforms'
import { mutationSchema } from '@/lib/validation/mutations'
import { persistProviderSnapshot } from '@/server/queries/provider.queries'
import type { Json } from '@/types/database'

function checkDatabaseError(error: { code: string } | null) {
  if (!error) return
  console.error('Vault mutation failed', { code: error.code })
  if (error.code === '42501')
    throw new AppError(
      'FORBIDDEN',
      'Editing is restricted to the approved members.',
      403,
    )
  if (error.code === '23505')
    throw new AppError(
      'CONFLICT',
      'That item already exists. Refresh and try again.',
      409,
    )
  throw new AppError(
    'SAVE_FAILED',
    'The change could not be saved. Please try again.',
    400,
  )
}

export async function executeMutation(
  input: unknown,
): Promise<{ id?: string; message: string }> {
  const payload = mutationSchema.safeParse(input)
  if (!payload.success)
    throw new AppError(
      'INVALID_INPUT',
      'Check your entries and try again.',
      400,
    )
  const mutation = payload.data
  const { client, editor } = await requireEditor()
  const context = mutation.context as unknown as Json

  switch (mutation.type) {
    case 'add': {
      const [movie, credits] = await Promise.all([
        fetchMovie(mutation.tmdbId),
        fetchMovieCredits(mutation.tmdbId),
      ])
      const { data, error } = await client.rpc('vault_add_movie', {
        p_movie: moviePersistencePayload(movie, credits) as unknown as Json,
        p_context: context,
        p_collection_id: mutation.collectionId ?? null,
      })
      checkDatabaseError(error)
      return { id: data ?? undefined, message: 'Movie saved to your vault.' }
    }
    case 'remove': {
      const { error } = await client.rpc('vault_remove_movie', {
        p_movie_id: mutation.movieId,
        p_context: context,
      })
      checkDatabaseError(error)
      return {
        message: 'Movie removed from the vault. Its history is preserved.',
      }
    }
    case 'watch': {
      const { error } = await client.rpc('vault_watch', {
        p_movie_id: mutation.movieId,
        p_watched: mutation.watched,
        p_watched_at: mutation.watchedAt ?? new Date().toISOString(),
        p_context: context,
        p_rewatch: mutation.rewatch ?? false,
      })
      checkDatabaseError(error)
      return {
        message: mutation.rewatch
          ? 'Another watch recorded.'
          : mutation.watched
            ? 'Marked as watched.'
            : 'Marked as unwatched. Your watch history is preserved.',
      }
    }
    case 'correct_watch': {
      const { error } = await client.rpc('vault_correct_watch', {
        p_event_id: mutation.eventId,
        p_watched_at: mutation.watchedAt,
        p_context: context,
      })
      checkDatabaseError(error)
      return { message: 'Watch date corrected.' }
    }
    case 'rate': {
      const { error } = await client.rpc('vault_rate', {
        p_movie_id: mutation.movieId,
        p_rating: mutation.rating,
        p_context: context,
      })
      checkDatabaseError(error)
      return {
        message:
          mutation.rating === null ? 'Rating removed.' : 'Your rating saved.',
      }
    }
    case 'collection': {
      const { data, error } = await client.rpc('vault_collection', {
        p_id: mutation.id ?? null,
        p_name: mutation.name,
        p_description: mutation.description,
        p_cover_movie_id: mutation.coverMovieId ?? null,
        p_context: context,
        p_archive: mutation.archive ?? false,
      })
      checkDatabaseError(error)
      return {
        id: data ?? undefined,
        message: mutation.archive
          ? 'Collection archived.'
          : mutation.id
            ? 'Collection updated.'
            : 'Collection created.',
      }
    }
    case 'membership': {
      const { error } = await client.rpc('vault_membership', {
        p_collection_id: mutation.collectionId,
        p_movie_id: mutation.movieId,
        p_remove: mutation.remove,
        p_context: context,
      })
      checkDatabaseError(error)
      return {
        message: mutation.remove
          ? 'Movie removed from collection.'
          : 'Movie added to collection.',
      }
    }
    case 'refresh_metadata': {
      const { data: stored, error: readError } = await client
        .from('movies')
        .select('id,tmdb_id')
        .eq('id', mutation.movieId)
        .eq('tmdb_id', mutation.tmdbId)
        .maybeSingle()
      checkDatabaseError(readError)
      if (!stored)
        throw new AppError(
          'NOT_FOUND',
          'This saved movie could not be found.',
          404,
        )
      const [movie, credits] = await Promise.all([
        fetchMovie(stored.tmdb_id, true),
        fetchMovieCredits(stored.tmdb_id, true),
      ])
      const { error } = await client.rpc('vault_refresh_movie', {
        p_movie_id: stored.id,
        p_movie: moviePersistencePayload(movie, credits) as unknown as Json,
        p_context: context,
      })
      checkDatabaseError(error)
      return { message: 'Movie metadata refreshed.' }
    }
    case 'refresh_providers': {
      const { data: stored, error } = await client
        .from('movies')
        .select('id,tmdb_id')
        .eq('id', mutation.movieId)
        .eq('tmdb_id', mutation.tmdbId)
        .maybeSingle()
      checkDatabaseError(error)
      if (!stored)
        throw new AppError(
          'NOT_FOUND',
          'This saved movie could not be found.',
          404,
        )
      const snapshot = normalizeProviders(
        await fetchWatchProviders(stored.tmdb_id),
        mutation.region,
      )
      await persistProviderSnapshot(
        stored.id,
        snapshot,
        mutation.context,
        editor.id,
      )
      return { message: 'Streaming availability refreshed.' }
    }
    case 'note': {
      const { error } = await client.rpc('vault_note', {
        p_movie_id: mutation.movieId,
        p_note: mutation.note,
        p_context: context,
      })
      checkDatabaseError(error)
      return {
        message: mutation.note
          ? 'Your private note saved.'
          : 'Your private note removed.',
      }
    }
  }
}
