import type { Metadata } from 'next'
import { SearchCombobox } from '@/components/search/search-combobox'
import { PageHeader } from '@/components/ui/page-header'
import { getVault } from '@/server/queries/vault.queries'
import { getEditor } from '@/lib/auth/require-editor'

export const metadata: Metadata = { title: 'Discover' }
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const [params, vault, editor] = await Promise.all([
    searchParams,
    getVault(),
    getEditor(),
  ])
  return (
    <>
      <PageHeader
        eyebrow="There’s always another great film"
        title="Follow the credits."
        description="Search your vault and the world of cinema. Movies, actors, directors — all in one place."
      />
      <SearchCombobox
        vault={vault}
        editor={editor}
        initialQuery={params.q?.slice(0, 120) ?? ''}
        full
      />
    </>
  )
}
