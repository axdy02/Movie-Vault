import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getEditor } from '@/lib/auth/require-editor'
import { getVault } from '@/server/queries/vault.queries'
import { DataNotice } from '@/components/layout/data-notice'
import { PageHeader } from '@/components/ui/page-header'
import { CollectionForm } from '@/features/collections/collection-form'
import { CollectionDirectory } from '@/features/collections/collection-directory'
import '@/styles/collections.css'

export const metadata: Metadata = {
  title: 'Collections',
  description: 'Personal shelves for every mood, theme, and movie night.',
}
export default async function CollectionsPage() {
  const [vault, editor] = await Promise.all([getVault(), getEditor()])
  return (
    <>
      <PageHeader
        eyebrow="Your shelves"
        title="Films that belong together."
        description="A feeling, a favorite, a plan for Sunday. Collections make room for your own way of seeing cinema."
      >
        {editor && <CollectionForm />}
      </PageHeader>
      <DataNotice vault={vault} />
      <Suspense fallback={<p className="result-count">Loading collections…</p>}>
        <CollectionDirectory
          collections={vault.collections}
          movies={vault.movies}
          canEdit={Boolean(editor)}
        />
      </Suspense>
    </>
  )
}
