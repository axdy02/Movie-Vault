import type { Metadata } from 'next'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { DataNotice } from '@/components/layout/data-notice'
import { LibraryBrowser } from '@/features/library/library-browser'
import { getVault } from '@/server/queries/vault.queries'
import { getEditor } from '@/lib/auth/require-editor'

export const metadata: Metadata = { title: 'The library' }
export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ region?: string }>
}) {
  const params = await searchParams
  const region =
    params.region && /^[A-Z]{2}$/.test(params.region) ? params.region : 'IN'
  const [vault, editor] = await Promise.all([getVault(region), getEditor()])
  return (
    <>
      <PageHeader
        eyebrow="Saved once. Loved in many ways."
        title="The library."
        description="The films we’ve kept, and the ones still waiting for their moment."
      >
        {editor && (
          <Button asChild>
            <Link href="/search">
              <Plus size={16} />
              Add a film
            </Link>
          </Button>
        )}
      </PageHeader>
      <DataNotice vault={vault} />
      <LibraryBrowser vault={vault} editor={editor} />
    </>
  )
}
