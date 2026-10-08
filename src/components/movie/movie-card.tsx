import Image from 'next/image'
import Link from 'next/link'
import { Check, Film, Star } from 'lucide-react'
import { movieHref, averageRating } from '@/lib/utils'
import type { LibraryMovie, MovieData } from '@/types/domain'

export function Poster({
  movie,
  priority = false,
}: {
  movie: MovieData
  priority?: boolean
}) {
  return movie.posterPath ? (
    <Image
      src={`https://image.tmdb.org/t/p/w500${movie.posterPath}`}
      alt={`${movie.title} poster`}
      fill
      sizes="(max-width: 479px) 45vw, (max-width: 767px) 29vw, (max-width: 1023px) 22vw, 250px"
      priority={priority}
    />
  ) : (
    <div className="poster-fallback">
      <Film size={30} strokeWidth={1} />
      <span>{movie.title}</span>
    </div>
  )
}

export function MovieCard({
  movie,
  saved = false,
  showAddedBy = false,
  context,
}: {
  movie: MovieData | LibraryMovie
  saved?: boolean
  showAddedBy?: boolean
  context?: string
}) {
  const library = 'states' in movie ? movie : null
  const watchedNames =
    library?.states
      .filter((state) => state.watched)
      .map((state) => state.displayName) ?? []
  const watched = watchedNames.length > 0
  const personalRating = library
    ? averageRating(library.states.map((state) => state.rating))
    : null
  return (
    <article className="movie-card">
      <Link
        href={movieHref(movie)}
        className="poster-link"
        aria-label={`${movie.title}, ${movie.year ?? 'year unknown'}${watched ? `, watched by ${watchedNames.join(' and ')}` : ''}`}
      >
        <div className={`poster ${watched ? 'poster-watched' : ''}`}>
          <Poster movie={movie} />
          {watched && (
            <span
              className="watched-badge"
              title={`Watched by ${watchedNames.join(' and ')}`}
            >
              <Check size={15} />
            </span>
          )}
          {saved && (
            <span className="saved-badge">
              <Check size={10} />
              Saved
            </span>
          )}
        </div>
      </Link>
      <h3 className="movie-card-title">
        <Link href={movieHref(movie)}>{movie.title}</Link>
      </h3>
      <div className="movie-card-meta">
        <span>{movie.year ?? 'Year unknown'}</span>
        {(personalRating ?? movie.tmdbRating) !== null && (
          <span
            className="rating-mini"
            title={
              personalRating !== null
                ? 'Average member rating'
                : 'TMDB community rating'
            }
          >
            <Star size={10} />
            {(personalRating ?? movie.tmdbRating)?.toFixed(1)}
          </span>
        )}
      </div>
      {context && <p className="card-context">{context}</p>}
      {showAddedBy && library && (
        <p className="card-context">Added by {library.addedBy}</p>
      )}
    </article>
  )
}
