import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Database, Fingerprint, Globe2, Layers3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'

export const metadata: Metadata = { title: 'About the vault' }
export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="A shared love of cinema"
        title="Good films. Better company."
        description="A living collection of films worth finding, remembering, and watching together."
      />
      <div className="about-grid">
        <div className="about-copy">
          <h2>From a list to a library.</h2>
          <p>
            Movie Vault began with a simple idea: two friends keeping a list of
            good movies, grouped by the people who made them. The vault turns
            that shared habit into a place to discover films, follow a
            filmography, and find the next watch.
          </p>
          <p>
            Every film has one place in the collection. It can appear under its
            actors, director, genres and collections while each member keeps
            their own ratings and watch history.
          </p>
          <p>
            Browsing is open to everyone. Changes are reserved for two approved
            members, and each change leaves a permanent activity record.
          </p>
          <div className="about-stack">
            {[
              'Next.js 16',
              'React 19',
              'TypeScript',
              'Tailwind CSS 4',
              'shadcn/ui',
              'Motion',
              'Supabase',
              'TMDB',
            ].map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
          <Button asChild style={{ marginTop: 28 }}>
            <Link href="/library">Explore the library</Link>
          </Button>
        </div>
        <div className="detail-panel">
          <h2>Behind the scenes</h2>
          <div className="architecture-row">
            <Layers3 size={19} />
            <div>
              <h3>One film, every view</h3>
              <p>
                Normalized movie, people and genre relationships derive the
                library’s browse views.
              </p>
            </div>
          </div>
          <div className="architecture-row">
            <Fingerprint size={19} />
            <div>
              <h3>Public read, private write</h3>
              <p>
                Verified server sessions and database policies protect every
                edit.
              </p>
            </div>
          </div>
          <div className="architecture-row">
            <Database size={19} />
            <div>
              <h3>History that stays</h3>
              <p>
                Watch events and immutable audits are preserved through
                corrections and removals.
              </p>
            </div>
          </div>
          <div className="architecture-row">
            <Globe2 size={19} />
            <div>
              <h3>Availability by country</h3>
              <p>
                Regional streaming snapshots keep discovery useful when external
                data is slow.
              </p>
            </div>
          </div>
        </div>
      </div>
      <section className="section about-copy">
        <h2>Credits</h2>
        <a
          href="https://www.themoviedb.org/"
          target="_blank"
          rel="noreferrer"
          aria-label="The Movie Database"
        >
          <Image
            src="/tmdb.svg"
            alt="TMDB"
            width={154}
            height={20}
            style={{ marginBlock: 20 }}
          />
        </a>
        <p>
          This product uses the TMDB API but is not endorsed or certified by
          TMDB. Film metadata and artwork are supplied by{' '}
          <a
            href="https://www.themoviedb.org"
            className="text-link"
            target="_blank"
            rel="noreferrer"
          >
            TMDB
          </a>
          .
        </p>
        <p>
          Streaming availability is provided by{' '}
          <a
            href="https://www.justwatch.com"
            className="text-link"
            target="_blank"
            rel="noreferrer"
          >
            JustWatch
          </a>{' '}
          through TMDB. Listings vary by country and may be incomplete. Provider
          links open the official listing returned by TMDB.
        </p>
      </section>
    </>
  )
}
