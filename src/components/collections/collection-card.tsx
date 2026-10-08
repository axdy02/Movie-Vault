import Image from 'next/image'
import Link from 'next/link'
import { Film, Layers3 } from 'lucide-react'
import type { CollectionData, LibraryMovie } from '@/types/domain'

export function CollectionCard({
  collection,
  movies,
}: {
  collection: CollectionData
  movies: LibraryMovie[]
}) {
  const members = movies.filter((movie) =>
    collection.movieIds.includes(movie.id),
  )
  const cover = members.find((movie) => movie.id === collection.coverMovieId)
  return (
    <Link href={`/collections/${collection.slug}`} className="collection-card">
      <div className="collection-cover">
        {cover?.backdropPath ? (
          <Image
            src={`https://image.tmdb.org/t/p/w780${cover.backdropPath}`}
            fill
            sizes="(max-width: 767px) 45vw, 30vw"
            alt={`Cover of ${collection.name}`}
          />
        ) : (
          Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="collection-cover-slot">
              {members[index]?.posterPath && (
                <Image
                  src={`https://image.tmdb.org/t/p/w342${members[index].posterPath}`}
                  alt=""
                  fill
                  sizes="100px"
                />
              )}
            </div>
          ))
        )}
        {members.length === 0 && (
          <span className="collection-empty-art">
            <Film size={34} strokeWidth={1} />
          </span>
        )}
      </div>
      <h3>{collection.name}</h3>
      {collection.description && (
        <p>
          {collection.description.length > 100
            ? `${collection.description.slice(0, 100)}…`
            : collection.description}
        </p>
      )}
      <span className="collection-count">
        <Layers3 size={12} />
        {members.length} {members.length === 1 ? 'film' : 'films'}
        {collection.pinned && ' · Pinned'}
      </span>
    </Link>
  )
}
