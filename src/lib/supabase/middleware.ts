import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'
import { getEnv } from '@/lib/env'

function configurationResponse() {
  return NextResponse.json(
    {
      code: 'NOT_CONFIGURED',
      error:
        'Movie Vault setup needs attention. Check the server environment configuration and restart the app.',
    },
    { status: 503, headers: { 'Cache-Control': 'no-store' } },
  )
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })
  let env: ReturnType<typeof getEnv>
  try {
    env = getEnv()
  } catch {
    // Validation errors may contain input values. Never send those to the browser.
    return configurationResponse()
  }
  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return response
  let supabase: ReturnType<typeof createServerClient<Database>>
  try {
    supabase = createServerClient<Database>(url, key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (entries) => {
          entries.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          entries.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, {
              ...options,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              httpOnly: true,
            }),
          )
        },
      },
    })
  } catch {
    return configurationResponse()
  }
  // getUser verifies with Auth; a cookie session alone does not prove identity.
  try {
    await supabase.auth.getUser()
  } catch {
    // Public browsing may continue during an Auth outage. Every protected server
    // operation independently verifies the user and active editor profile.
    console.error('Supabase session refresh is temporarily unavailable')
  }
  response.headers.set('Cache-Control', 'private, no-store')
  return response
}
