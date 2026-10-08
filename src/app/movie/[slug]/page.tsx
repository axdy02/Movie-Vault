import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Check, ChevronRight, Clock3, Star, UserRound } from 'lucide-react'
import { Poster } from '@/components/movie/movie-card'
import { AddMovieButton } from '@/components/movie/add-movie-button'
import { Button } from '@/components/ui/button'
import { ProviderList } from '@/features/providers/provider-list'
import { WatchedStatus } from '@/features/watch-history/watched-status'
import { MovieTracking } from '@/features/watch-history/movie-tracking'
import {
  getMovie,
  getMovieMetadata,
  getPersonalNote,
  getVault,
  getWatchHistory,
} from '@/server/queries/vault.queries'
import { getEditor } from '@/lib/auth/require-editor'
import { formatDate, personHref, runtimeLabel } from '@/lib/utils'

function idFromSlug(slug: string) {
  const match = /^([1-9]\d*)(?:-|$)/.exec(slug)
  const id = match ? Number(match[1]) : 0
  return Number.isSafeInteger(id) ? id : 0
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const id = idFromSlug(slug)
  if (!id) return { title: 'Film not found' }
  const result = await getMovieMetadata(id)
  return {
    title: result?.title ?? 'Film not found',
    description: result?.overview ?? 'Explore a film in Movie Vault.',
  }
}

export default async function MoviePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ region?: string }>
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams])
  const id = idFromSlug(slug)
  if (!id) notFound()
  const region =
    query.region && /^[A-Z]{2}$/.test(query.region) ? query.region : 'IN'
  const [result, vault, editor] = await Promise.all([
    getMovie(id, region),
    getVault(region),
    getEditor(),
  ])
  if (!result) notFound()
  const { movie, libraryMovie, providers } = result
  const [historyResult, noteResult] =
    editor && libraryMovie
      ? await Promise.allSettled([
          getWatchHistory(libraryMovie.id),
          getPersonalNote(libraryMovie.id),
        ])
      : []
  const history =
    historyResult?.status === 'fulfilled' ? historyResult.value : []
  const note = noteResult?.status === 'fulfilled' ? noteResult.value : null
  const cast = movie.credits
    .filter((credit) => credit.type === 'cast')
    .slice(0, 12)
  const directors = movie.credits.filter((credit) => credit.job === 'Director')
  return (
    <>
      {movie.backdropPath && (
        <div className="detail-backdrop">
          <Image
            src={`https://image.tmdb.org/t/p/w1280${movie.backdropPath}`}
            fill
            alt=""
            sizes="100vw"
            priority
          />
        </div>
      )}
      <nav aria-label="Breadcrumb" className="breadcrumb">
        <Link href="/library">Library</Link>
        <ChevronRight size={12} />
        <span>{movie.title}</span>
      </nav>
      <header className="movie-hero">
        <div className="detail-poster">
          <div className="poster">
            <Poster movie={movie} priority />
          </div>
        </div>
        <div className="detail-copy">
          <p className="eyebrow">
            {libraryMovie ? 'A story in our vault' : 'A discovery from TMDB'}
          </p>
          <h1>{movie.title}</h1>
          {movie.originalTitle && movie.originalTitle !== movie.title && (
            <p className="original-title">{movie.originalTitle}</p>
          )}
          <div className="detail-meta">
            <span>{movie.year ?? 'Year unknown'}</span>
            <span>
              <Clock3 size={13} />
              {runtimeLabel(movie.runtime)}
            </span>
            {movie.tmdbRating !== null && (
              <span>
                <Star size={13} className="text-accent" />
                {movie.tmdbRating.toFixed(1)}
                <span className="text-muted">
                  / 10 · TMDB
                  {movie.voteCount !== null &&
                    ` · ${movie.voteCount.toLocaleString('en-IN')} votes`}
                </span>
              </span>
            )}
          </div>
          <div className="genre-pills">
            {movie.genres.map((genre) => (
              <Link
                key={genre.id}
                className="genre-pill"
                href={`/library?genre=${genre.id}`}
              >
                {genre.name}
              </Link>
            ))}
          </div>
          <p className="movie-overview">
            {movie.overview ??
              'A synopsis has not been provided for this film.'}
          </p>
          <div className="detail-actions">
            {libraryMovie ? (
              <span className="button button-secondary">
                <Check size={15} />
                Saved in vault
              </span>
            ) : editor ? (
              <AddMovieButton
                tmdbId={movie.tmdbId}
                context={{ surface: 'movie_detail' }}
              />
            ) : (
              <span className="public-notice">
                <span className="status-dot" />
                Discover freely. Members can add films to the vault.
              </span>
            )}
            {libraryMovie && (
              <span className="provider-freshness">
                Added by {libraryMovie.addedBy} ·{' '}
                {formatDate(libraryMovie.addedAt)}
              </span>
            )}
          </div>
          {directors.length > 0 && (
            <p className="provider-freshness">
              Directed by{' '}
              {directors.map((director, index) => (
                <span key={director.tmdbId}>
                  {index > 0 && ', '}
                  <Link
                    className="text-secondary"
                    href={`${personHref(director)}?role=director`}
                  >
                    {director.name}
                  </Link>
                </span>
              ))}
            </p>
          )}
        </div>
      </header>
      {result.error && (
        <div className="data-notice" role="status">
          {result.error}
        </div>
      )}
      <div className="detail-grid">
        <div>
          <section className="detail-panel">
            <WatchedStatus
              states={libraryMovie?.states ?? []}
              editors={vault.editors}
            />
            {editor && libraryMovie && (
              <MovieTracking
                key={libraryMovie.id}
                movie={libraryMovie}
                editor={editor}
                editors={vault.editors}
                collections={vault.collections}
                history={history}
                historyError={
                  historyResult?.status === 'rejected'
                    ? 'Watch history could not be loaded. Reload to try again.'
                    : undefined
                }
                note={note}
                noteError={
                  noteResult?.status === 'rejected'
                    ? 'Your private note could not be loaded. Reload to try again.'
                    : undefined
                }
              />
            )}
          </section>
          <section className="detail-panel">
            <h2>The people behind the story</h2>
            {cast.length ? (
              <div className="person-list">
                {cast.map((credit) => (
                  <Link
                    className="cast-card"
                    href={personHref(credit)}
                    key={`${credit.tmdbId}-${credit.character}`}
                  >
                    <div className="cast-image">
                      {credit.profilePath ? (
                        <Image
                          src={`https://image.tmdb.org/t/p/w185${credit.profilePath}`}
                          fill
                          sizes="(max-width: 767px) 25vw, 210px"
                          alt={credit.name}
                        />
                      ) : (
                        <UserRound size={25} />
                      )}
                    </div>
                    <strong>{credit.name}</strong>
                    <p>{credit.character ?? 'Cast'}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="provider-empty">
                Cast information is not listed for this title.
              </p>
            )}
          </section>
        </div>
        <aside>
          <ProviderList
            key={movie.tmdbId}
            useStoredPreference={!query.region}
            tmdbId={movie.tmdbId}
            movieId={libraryMovie?.id}
            initial={providers}
            canRefresh={Boolean(editor && libraryMovie)}
          />
          <section className="detail-panel">
            <h2>In these collections</h2>
            {libraryMovie?.collectionIds.length ? (
              vault.collections
                .filter((collection) =>
                  libraryMovie.collectionIds.includes(collection.id),
                )
                .map((collection) => (
                  <Link
                    href={`/collections/${collection.slug}`}
                    key={collection.id}
                    className="state-row"
                  >
                    <strong style={{ fontWeight: 500, fontSize: 13 }}>
                      {collection.name}
                    </strong>
                    <ChevronRight size={13} style={{ marginLeft: 'auto' }} />
                  </Link>
                ))
            ) : (
              <p className="provider-empty">
                This film has not joined a collection yet.
              </p>
            )}
          </section>
          <section className="detail-panel">
            <h2>Film details</h2>
            <div className="state-row">
              <span className="field-label">Released</span>
              <span
                className="text-secondary"
                style={{ marginLeft: 'auto', fontSize: 12 }}
              >
                {movie.releaseDate ? formatDate(movie.releaseDate) : 'Unknown'}
              </span>
            </div>
            <div className="state-row">
              <span className="field-label">Original language</span>
              <span
                className="text-secondary"
                style={{ marginLeft: 'auto', fontSize: 12 }}
              >
                {movie.language
                  ? new Intl.DisplayNames('en', { type: 'language' }).of(
                      movie.language,
                    )
                  : 'Unknown'}
              </span>
            </div>
            <div className="state-row">
              <span className="field-label">Countries</span>
              <span
                className="text-secondary"
                style={{ marginLeft: 'auto', fontSize: 12, textAlign: 'right' }}
              >
                {movie.countries.join(', ') || 'Not listed'}
              </span>
            </div>
            <div className="detail-actions">
              <Button variant="ghost" size="sm" asChild>
                <a
                  href={`https://www.themoviedb.org/movie/${movie.tmdbId}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View on TMDB
                  <ChevronRight size={13} />
                </a>
              </Button>
            </div>
          </section>
        </aside>
      </div>
    </>
  )
}
