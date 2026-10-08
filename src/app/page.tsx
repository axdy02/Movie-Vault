import Link from 'next/link'
import {
  ArrowUpRight,
  Bookmark,
  CheckCheck,
  CirclePlay,
  Film,
  Plus,
  Star,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { SectionHeader } from '@/components/ui/section-header'
import { Reveal } from '@/components/ui/reveal'
import { DataNotice } from '@/components/layout/data-notice'
import { MovieCard } from '@/components/movie/movie-card'
import { PreviewGrid } from '@/components/layout/preview-grid'
import { PersonCard } from '@/components/people/person-card'
import { CollectionCard } from '@/components/collections/collection-card'
import { CollectionForm } from '@/features/collections/collection-form'
import { SearchCombobox } from '@/components/search/search-combobox'
import { getEditor } from '@/lib/auth/require-editor'
import { getRecentlyWatched, getVault } from '@/server/queries/vault.queries'
import { averageRating } from '@/lib/utils'
import { filterMovies, sortMovies } from '@/features/library/filters'
import { derivePeopleDirectory } from '@/features/discovery/people-directory-model'
import { PAGE_SIZE } from '@/lib/constants'

export default async function HomePage() {
  const [vault, editor, watchedEvents] = await Promise.all([
    getVault(),
    getEditor(),
    getRecentlyWatched(PAGE_SIZE),
  ])
  const unwatched = filterMovies(
    vault.movies,
    { status: 'unwatched' },
    editor?.id,
  )
  const watchedBoth = vault.movies.filter(
    (movie) =>
      movie.states.length === 2 && movie.states.every((state) => state.watched),
  ).length
  const watchedOne = vault.movies.filter(
    (movie) => movie.states.filter((state) => state.watched).length === 1,
  ).length
  const neither = vault.movies.filter((movie) =>
    movie.states.every((state) => !state.watched),
  ).length
  const rating = averageRating(
    vault.movies.flatMap((movie) => movie.states.map((state) => state.rating)),
  )
  const people = derivePeopleDirectory(vault, { sort: 'leads-desc' }).slice(
    0,
    PAGE_SIZE,
  )
  const recent = sortMovies(vault.movies, 'added-desc').slice(0, PAGE_SIZE)
  const recentlyWatched = watchedEvents.flatMap((event) => {
    const movie = vault.movies.find((entry) => entry.id === event.movieId)
    return movie ? [movie] : []
  })
  const stats = [
    { label: 'Films in the vault', value: vault.movies.length, icon: Film },
    { label: 'Watched together', value: watchedBoth, icon: CheckCheck },
    { label: 'Waiting for both', value: neither, icon: Bookmark },
    { label: 'Watched by one', value: watchedOne, icon: Users },
    { label: 'Member rating', value: rating?.toFixed(1) ?? '—', icon: Star },
  ]

  return (
    <>
      <div className="home-intro">
        <div>
          <h1>
            {editor
              ? `Welcome back, ${editor.displayName}.`
              : 'Your corner of cinema.'}
          </h1>
          <p>One shared library. A world of stories to explore.</p>
        </div>
        {editor ? (
          <div className="page-header-actions">
            <CollectionForm />
            <Button asChild variant="secondary" size="sm">
              <Link href="/search">
                <Plus size={14} />
                Add a film
              </Link>
            </Button>
          </div>
        ) : (
          <span className="public-notice">
            <span className="status-dot" />
            Public vault · Members curate, everyone explores
          </span>
        )}
      </div>
      <Reveal className="home-hero">
        <div className="hero-copy">
          <p className="eyebrow">For the love of the next great film</p>
          <h2>
            Good films.
            <br />
            <span>Better company.</span>
          </h2>
          <p>
            A home for the films we love, the ones we’ve watched, and the
            stories still waiting for us.
          </p>
          <div className="hero-search">
            <SearchCombobox vault={vault} editor={editor} />
          </div>
        </div>
        <div className="hero-art" aria-hidden>
          <div className="reel-orbit">
            <i className="reel-hole" />
            <i className="reel-hole" />
            <i className="reel-hole" />
            <i className="reel-hole" />
          </div>
          <span className="hero-art-caption">
            DISCOVER · COLLECT · WATCH · REPEAT
          </span>
        </div>
      </Reveal>
      <div className="stats-strip">
        {stats.map(({ label, value, icon: Icon }) => (
          <div className="stat" key={label}>
            <span className="stat-icon">
              <Icon size={18} strokeWidth={1.5} />
            </span>
            <div>
              <span className="stat-value">{value}</span>
              <span className="stat-label">{label}</span>
            </div>
          </div>
        ))}
      </div>
      <DataNotice vault={vault} />
      <section>
        <div className="section-tabs">
          <Link className="section-tab section-tab-active" href="/library">
            The watchlist
            <span className="section-count">{unwatched.length}</span>
          </Link>
          <Link className="section-tab" href="/library?status=watched">
            Watched
          </Link>
          <Link className="section-tab" href="/genres">
            By genre
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link href="/library">
              Explore library
              <ArrowUpRight size={14} />
            </Link>
          </Button>
        </div>
        {unwatched.length > 0 ? (
          <PreviewGrid className="poster-grid">
            {unwatched.slice(0, PAGE_SIZE).map((movie) => (
              <MovieCard key={movie.tmdbId} movie={movie} />
            ))}
          </PreviewGrid>
        ) : (
          <EmptyState
            title={
              vault.movies.length
                ? 'Every film has had its moment.'
                : 'The next great film starts here.'
            }
            description={
              vault.movies.length
                ? 'Your watchlist is clear. Explore the library or discover something new for your next movie night.'
                : editor
                  ? 'Your vault is a blank canvas. Search for a favorite, add it once, and let the collection grow.'
                  : 'No films have been added yet. Explore movies and filmmakers while the members build their collection.'
            }
            href="/search"
            action="Discover a film"
          />
        )}
      </section>
      <section className="section">
        <SectionHeader
          title="Continue exploring"
          href="/actors"
          label="All people"
          subtitle="Follow familiar faces to unfamiliar stories."
        />
        {people.length ? (
          <PreviewGrid className="people-grid" initialCount={10}>
            {people.map(({ person, movies }) => (
              <PersonCard
                key={person.tmdbId}
                person={person}
                role="actor"
                savedCount={movies.length}
                watchedCount={
                  movies.filter((movie) =>
                    editor
                      ? movie.states.some(
                          (state) =>
                            state.userId === editor.id && state.watched,
                        )
                      : movie.states.some((state) => state.watched),
                  ).length
                }
              />
            ))}
          </PreviewGrid>
        ) : (
          <EmptyState
            title="Every film leads to someone."
            description="Performers from saved films will appear here, with their filmographies ready to explore."
            href="/search"
            action="Find a filmmaker"
            compact
          />
        )}
      </section>
      <section className="section">
        <SectionHeader
          title="Recently added"
          count={recent.length}
          href="/library"
        />
        {recent.length ? (
          <PreviewGrid className="poster-grid">
            {recent.map((movie) => (
              <MovieCard
                key={movie.tmdbId}
                movie={movie}
                showAddedBy={Boolean(editor)}
              />
            ))}
          </PreviewGrid>
        ) : (
          <EmptyState
            title="The collection is just beginning."
            description="New additions will land here. Every film is saved once and shared across the entire vault."
            compact
          />
        )}
      </section>
      <section className="section">
        <SectionHeader
          title="Recently watched"
          count={recentlyWatched.length}
          href="/library?sort=watched-desc"
          subtitle="Our latest movie nights, remembered."
        />
        {recentlyWatched.length ? (
          <PreviewGrid className="poster-grid">
            {recentlyWatched.map((movie) => (
              <MovieCard key={movie.tmdbId} movie={movie} />
            ))}
          </PreviewGrid>
        ) : (
          <EmptyState
            title="The first movie night awaits."
            description="Recorded watches and rewatches will appear here. Each member keeps their own watch history."
            compact
          />
        )}
      </section>
      <section className="section">
        <SectionHeader
          title="A collection for every mood"
          href="/collections"
          label="All collections"
        />
        {vault.collections.length ? (
          <PreviewGrid className="collections-grid" initialCount={6}>
            {[...vault.collections]
              .sort((a, b) => Number(b.pinned) - Number(a.pinned))
              .slice(0, PAGE_SIZE)
              .map((collection) => (
                <CollectionCard
                  key={collection.id}
                  collection={collection}
                  movies={vault.movies}
                />
              ))}
          </PreviewGrid>
        ) : (
          <EmptyState
            title="Some films belong together."
            description="Handpicked collections will live here — for a mood, a movie night, or just because."
            href="/collections"
            action="Explore collections"
            compact
          />
        )}
      </section>
      <div
        className="section"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: 23,
        }}
      >
        <span
          className="text-secondary"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 12,
          }}
        >
          <CirclePlay size={16} className="text-accent" />
          Discover something worth your evening.
        </span>
        <Link href="/about" className="text-link">
          About Movie Vault
          <ArrowUpRight size={13} />
        </Link>
      </div>
    </>
  )
}
