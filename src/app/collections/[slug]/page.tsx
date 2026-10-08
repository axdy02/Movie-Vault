import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, History } from 'lucide-react'
import { getEditor } from '@/lib/auth/require-editor'
import { getVault } from '@/server/queries/vault.queries'
import { parseFilters } from '@/features/library/filters'
import { LibraryBrowser } from '@/features/library/library-browser'
import {
  ArchiveCollection,
  CollectionForm,
} from '@/features/collections/collection-form'
import { CollectionMoviePicker } from '@/features/collections/collection-movie-picker'
import { DataNotice } from '@/components/layout/data-notice'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import '@/styles/collections.css'

export default async function CollectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams])
  const filters = parseFilters(query)
  const [vault, editor] = await Promise.all([
    getVault(filters.region ?? 'IN'),
    getEditor(),
  ])
  const collection = vault.collections.find((entry) => entry.slug === slug)
  if (!collection) {
    if (vault.error)
      return (
        <>
          <PageHeader
            eyebrow="Your shelves"
            title="This shelf is taking a moment."
            description="The collection could not be loaded. Please refresh to try the connection again."
          />
          <DataNotice vault={vault} />
          <Button asChild variant="secondary">
            <Link href={`/collections/${encodeURIComponent(slug)}`}>
              Try again
            </Link>
          </Button>
        </>
      )
    notFound()
  }
  const cover = vault.movies.find(
    (movie) => movie.id === collection.coverMovieId,
  )
  return (
    <>
      <Link className="text-link breadcrumb" href="/collections">
        <ArrowLeft size={14} />
        All collections
      </Link>
      <div className="collection-hero">
        {cover?.backdropPath && (
          <Image
            src={`https://image.tmdb.org/t/p/w1280${cover.backdropPath}`}
            alt=""
            fill
            sizes="100vw"
            priority
          />
        )}
        <PageHeader
          eyebrow={`${collection.movieIds.length} films · A personal shelf`}
          title={collection.name}
          description={
            collection.description ||
            'A collection of films, brought together by the members.'
          }
        >
          {editor && (
            <>
              <CollectionMoviePicker collection={collection} vault={vault} />
              <CollectionForm collection={collection} movies={vault.movies} />
              <ArchiveCollection collection={collection} />
            </>
          )}
        </PageHeader>
      </div>
      <DataNotice vault={vault} />
      <LibraryBrowser
        vault={vault}
        editor={editor}
        collectionId={collection.id}
      />
      <div className="form-actions">
        <Button asChild variant="ghost">
          <Link href={`/activity?collectionId=${collection.id}`}>
            <History size={15} />
            Collection activity
          </Link>
        </Button>
      </div>
    </>
  )
}
