import 'server-only'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { ConfigurationError } from '@/lib/auth/errors'
import { getEnv } from '@/lib/env'

// Reserved for the provider cache system RPC. Editor mutations use cookie credentials.
export function createProviderCacheClient() {
  const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key } =
    getEnv()
  if (!url || !key)
    throw new ConfigurationError(
      'Provider caching needs its server connection configured.',
    )
  return createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
