import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getEditor } from '@/lib/auth/require-editor'
import { PageHeader } from '@/components/ui/page-header'
import { AccountSettings } from '@/features/auth/account-settings'

export const metadata: Metadata = {
  title: 'Settings',
  robots: { index: false, follow: false },
}
export default async function SettingsPage() {
  const editor = await getEditor()
  if (!editor) redirect('/login?next=%2Fsettings')
  return (
    <>
      <PageHeader
        eyebrow="Your vault"
        title="Make yourself at home."
        description={`Signed in as ${editor.displayName}. Your viewing preferences and account session.`}
      />
      <div className="settings-grid">
        <AccountSettings />
      </div>
    </>
  )
}
