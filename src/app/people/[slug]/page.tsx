import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronRight, UserRound } from 'lucide-react'
import { SectionHeader } from '@/components/ui/section-header'
import { EmptyState } from '@/components/ui/empty-state'
import { Filmography } from '@/features/discovery/filmography'
import { SavedPersonMovies } from '@/features/discovery/saved-person-movies'
import { getEditor } from '@/lib/auth/require-editor'
import {
  getPerson,
  getPersonMetadata,
  getVault,
} from '@/server/queries/vault.queries'

function personId(slug: string) {
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
  const id = personId(slug)
  if (!id) return { title: 'Person not found' }
  const data = await getPersonMetadata(id)
  return {
    title: data?.name ?? 'Person not found',
    description:
      data?.biography?.slice(0, 160) ??
      'Follow the people behind your favorite films.',
  }
}

export default async function PersonPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ role?: string }>
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams])
  const id = personId(slug)
  if (!id) notFound()
  const [data, vault, editor] = await Promise.all([
    getPerson(id),
    getVault(),
    getEditor(),
  ])
  if (!data) notFound()
  const { person, filmography } = data
  const director =
    query.role === 'director' ||
    (!query.role && person.department === 'Directing')
  const saved = vault.movies.filter((movie) =>
    movie.credits.some(
      (credit) =>
        credit.tmdbId === id &&
        (director ? credit.job === 'Director' : credit.type === 'cast'),
    ),
  )
  const watched = saved.filter((movie) =>
    movie.states.some(
      (state) => state.watched && (!editor || state.userId === editor.id),
    ),
  ).length
  return (
    <>
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href={director ? '/directors' : '/actors'}>
          {director ? 'Directors' : 'Actors'}
        </Link>
        <ChevronRight size={12} />
        <span>{person.name}</span>
      </nav>
      <header className="person-header">
        <div className="person-header-image">
          {person.profilePath ? (
            <Image
              src={`https://image.tmdb.org/t/p/w342${person.profilePath}`}
              fill
              alt={person.name}
              sizes="(max-width: 479px) 95px, (max-width: 767px) 128px, 170px"
              priority
            />
          ) : (
            <UserRound size={40} strokeWidth={1} />
          )}
        </div>
        <div>
          <p className="eyebrow">The people behind our stories</p>
          <h1>{person.name}</h1>
          <p>
            {person.department ?? 'Film'}
            {person.knownFor.length
              ? ` · ${person.knownFor.slice(0, 2).join(' · ')}`
              : ''}
          </p>
          <div className="person-progress">
            <span>
              <strong>{saved.length}</strong>saved films
            </span>
            <span>
              <strong>{watched}</strong>
              {editor ? 'watched by you' : 'watched by a member'}
            </span>
          </div>
        </div>
      </header>
      {person.biography && (
        <div className="biography">
          {person.biography.length > 600 ? (
            <details>
              <summary
                style={{
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  marginBottom: 12,
                }}
              >
                About {person.name}
              </summary>
              <p>{person.biography}</p>
            </details>
          ) : (
            <p>{person.biography}</p>
          )}
        </div>
      )}
      {data.error && (
        <div className="data-notice" role="status">
          {data.error}
        </div>
      )}
      <section className="section">
        <SectionHeader
          title={
            director ? 'Directed films in the vault' : 'Saved in the vault'
          }
          count={saved.length}
          href={`/library?${director ? 'director' : 'actor'}=${person.tmdbId}`}
        />
        {saved.length ? (
          <SavedPersonMovies
            movies={saved}
            personTmdbId={id}
            director={director}
            currentUserId={editor?.id}
          />
        ) : (
          <EmptyState
            title="A new thread to follow."
            description={`No ${director ? 'directed' : 'acting'} films by ${person.name} have been saved yet. Explore their credits below.`}
            compact
          />
        )}
      </section>
      <section className="section">
        <SectionHeader
          title="Beyond the vault"
          subtitle="Explore their wider filmography. Saved films are marked so you can find something new."
        />
        <Filmography
          person={person}
          movies={filmography}
          library={vault.movies}
          editor={editor}
        />
      </section>
    </>
  )
}
