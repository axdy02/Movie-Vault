import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'
import { ConfigurationError } from '@/lib/auth/errors'
import { getEnv, isSupabaseConfigured } from '@/lib/env'

export { isSupabaseConfigured }

export async function createSupabaseServerClient() {
  const { NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_ANON_KEY: key } =
    getEnv()
  if (!url || !key) throw new ConfigurationError()
  const cookieStore = await cookies()
  return createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (entries) => {
        try {
          entries.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, {
              ...options,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              httpOnly: true,
            }),
          )
        } catch {
          // Server Components cannot write cookies. The request proxy refreshes them.
        }
      },
    },
  })
}
