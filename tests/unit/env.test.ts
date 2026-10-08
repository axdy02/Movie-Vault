import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getEnv, isSupabaseConfigured } from '@/lib/env'

beforeEach(() => {
  for (const name of [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_SITE_URL',
    'NEXT_PUBLIC_DEFAULT_REGION',
    'TMDB_READ_ACCESS_TOKEN',
    'SUPABASE_SERVICE_ROLE_KEY',
  ])
    vi.stubEnv(name, undefined)
})
afterEach(() => vi.unstubAllEnvs())

describe('environment configuration', () => {
  it('keeps the credential-free public preview available', () => {
    expect(isSupabaseConfigured()).toBe(false)
    expect(getEnv().NEXT_PUBLIC_SITE_URL).toBe('http://localhost:3000')
  })
  it.each(['https://project.supabase.co', 'http://127.0.0.1:54321'])(
    'accepts a complete project URL %s',
    (url) => {
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', url)
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'sb_publishable_test')
      expect(isSupabaseConfigured()).toBe(true)
      expect(getEnv().NEXT_PUBLIC_SUPABASE_URL).toBe(url)
    },
  )
  it.each([
    'project.supabase.co',
    'https//project.supabase.co',
    'https:project.supabase.co',
    'ftp://project.supabase.co',
    'https://name:password@project.supabase.co',
    'https://project.supabase.co?token=secret',
    'https://project.supabase.co#secret',
  ])('rejects malformed or unsafe project URLs %s', (url) => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', url)
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'sb_publishable_test')
    expect(getEnv).toThrow('NEXT_PUBLIC_SUPABASE_URL')
  })
  it('identifies the invalid field without disclosing its rejected value or keys', () => {
    vi.stubEnv(
      'NEXT_PUBLIC_SUPABASE_URL',
      'private-token-accidentally-pasted-as-url',
    )
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'private-key-value')
    try {
      getEnv()
      throw new Error('Expected validation failure')
    } catch (error) {
      expect(error).toBeInstanceOf(Error)
      expect((error as Error).message).toContain('NEXT_PUBLIC_SUPABASE_URL')
      expect((error as Error).message).not.toContain('private-token')
      expect((error as Error).message).not.toContain('private-key')
    }
  })
  it('requires the project URL and public key together', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.co')
    expect(getEnv).toThrow('Configure both Supabase URL and anon key.')
  })
  it('normalizes incidental whitespace and treats blank credentials as absent', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '  https://project.supabase.co  ')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '  sb_publishable_test  ')
    vi.stubEnv('TMDB_READ_ACCESS_TOKEN', '  ')
    expect(getEnv()).toMatchObject({
      NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_test',
      TMDB_READ_ACCESS_TOKEN: undefined,
    })
  })
  it('rejects non-HTTP public site URLs', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'file:///somewhere')
    expect(getEnv).toThrow('NEXT_PUBLIC_SITE_URL')
  })
})
