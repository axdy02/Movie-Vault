import type { Metadata } from 'next'
import { Suspense } from 'react'
import { PageHeader } from '@/components/ui/page-header'
import { DataNotice } from '@/components/layout/data-notice'
import { GenreDirectory } from '@/features/discovery/genre-directory'
import { getVault } from '@/server/queries/vault.queries'

export const metadata: Metadata = { title: 'Genres' }
export default async function GenresPage() {
  const vault = await getVault()
  return (
    <>
      <PageHeader
        eyebrow="Find a film for the feeling"
        title="Pick your mood."
        description="A story for every kind of evening. Genres grow naturally from the films in our vault."
      />
      <DataNotice vault={vault} />
      <Suspense fallback={<p className="result-count">Loading genres…</p>}>
        <GenreDirectory movies={vault.movies} />
      </Suspense>
    </>
  )
}
