import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { LockKeyhole } from 'lucide-react'
import { getEditor } from '@/lib/auth/require-editor'
import { isSupabaseConfigured } from '@/lib/env'
import { LoginForm } from '@/features/auth/login-form'

export const metadata: Metadata = {
  title: 'Member login',
  robots: { index: false, follow: false },
}
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const [editor, params] = await Promise.all([getEditor(), searchParams])
  if (editor) redirect('/library')
  const next =
    params.next?.startsWith('/') &&
    !params.next.startsWith('//') &&
    !params.next.includes('\\')
      ? params.next
      : '/library'
  return (
    <div className="login-container">
      <div className="login-symbol">
        <LockKeyhole size={25} />
      </div>
      <p className="eyebrow">Members’ entrance</p>
      <h1>Welcome back.</h1>
      <p>
        Your shared collection. Your own watch history.
        <br />
        Sign in to make the next addition.
      </p>
      <div className="login-panel">
        <LoginForm next={next} configured={isSupabaseConfigured()} />
      </div>
      <p className="login-footnote">
        Editing is reserved for our two invited members.
        <br />
        Everyone is welcome to explore the vault.
      </p>
    </div>
  )
}
