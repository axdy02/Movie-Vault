import { MovieCard } from './movie-card'
import type { LibraryMovie, MovieData } from '@/types/domain'

export function MovieGrid({
  movies,
  showAddedBy = false,
}: {
  movies: (LibraryMovie | MovieData)[]
  showAddedBy?: boolean
}) {
  return (
    <div className="poster-grid">
      {movies.map((movie) => (
        <MovieCard key={movie.tmdbId} movie={movie} showAddedBy={showAddedBy} />
      ))}
    </div>
  )
}
