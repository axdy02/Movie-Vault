import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { CookieOptions } from '@supabase/ssr'
import { updateSession } from '@/lib/supabase/middleware'

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  getUser: vi.fn(),
}))
vi.mock('@supabase/ssr', () => ({
  createServerClient: mocks.createServerClient,
}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://fixture-project.supabase.co')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'fixture-anon-key')
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'http://localhost:3000')
  vi.stubEnv('NEXT_PUBLIC_DEFAULT_REGION', 'IN')
  vi.stubEnv('TMDB_READ_ACCESS_TOKEN', '')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '')
  mocks.getUser.mockResolvedValue({ data: { user: null }, error: null })
  mocks.createServerClient.mockReturnValue({ auth: { getUser: mocks.getUser } })
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('Supabase proxy configuration boundary', () => {
  it.each([
    'fixture-project.supabase.co',
    'not-a-url',
    'ftp://fixture-project.supabase.co',
    'javascript:fixture-private-value',
  ])(
    'rejects malformed or unsupported URLs before SDK creation: %s',
    async (url) => {
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', url)
      const response = await updateSession(
        new NextRequest('http://localhost:3000/library'),
      )
      expect(response.status).toBe(503)
      expect(await response.json()).toEqual({
        code: 'NOT_CONFIGURED',
        error:
          'Movie Vault setup needs attention. Check the server environment configuration and restart the app.',
      })
      expect(mocks.createServerClient).not.toHaveBeenCalled()
      expect(mocks.getUser).not.toHaveBeenCalled()
    },
  )

  it('permits the public shell when Supabase is intentionally unconfigured', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')
    const response = await updateSession(
      new NextRequest('http://localhost:3000/library'),
    )
    expect(response.headers.get('x-middleware-next')).toBe('1')
    expect(mocks.createServerClient).not.toHaveBeenCalled()
  })

  it('rejects partial configuration without exposing the configured value', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')
    const response = await updateSession(
      new NextRequest('http://localhost:3000/library'),
    )
    expect(response.status).toBe(503)
    expect(await response.text()).not.toContain('fixture-project')
    expect(mocks.createServerClient).not.toHaveBeenCalled()
  })

  it('preserves verified cookie refresh and secure production cookie attributes', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    type Adapter = {
      getAll: () => { name: string; value: string }[]
      setAll: (
        entries: { name: string; value: string; options: CookieOptions }[],
      ) => void
    }
    mocks.createServerClient.mockImplementation(
      (_url: string, _key: string, options: { cookies: Adapter }) => {
        options.cookies.setAll([
          {
            name: 'fixture-session',
            value: 'fixture-session-value',
            options: { path: '/' },
          },
        ])
        return { auth: { getUser: mocks.getUser } }
      },
    )
    const request = new NextRequest('http://localhost:3000/library')
    const response = await updateSession(request)
    expect(mocks.getUser).toHaveBeenCalledOnce()
    expect(request.cookies.get('fixture-session')?.value).toBe(
      'fixture-session-value',
    )
    expect(response.cookies.get('fixture-session')).toMatchObject({
      secure: true,
      httpOnly: true,
      sameSite: 'lax',
    })
    expect(response.headers.get('cache-control')).toBe('private, no-store')
  })

  it('contains unexpected SDK creation errors without exposing their input values', async () => {
    mocks.createServerClient.mockImplementation(() => {
      throw new Error('SDK rejected fixture-private-value')
    })
    const response = await updateSession(
      new NextRequest('http://localhost:3000/library'),
    )
    expect(response.status).toBe(503)
    expect(await response.text()).not.toContain('fixture-private-value')
    expect(mocks.getUser).not.toHaveBeenCalled()
  })

  it('keeps public requests usable during a transient Auth failure without trusting cookies as identity', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mocks.getUser.mockRejectedValue(
      new Error('Network failure including fixture-private-value'),
    )
    const response = await updateSession(
      new NextRequest('http://localhost:3000/library'),
    )
    expect(response.headers.get('x-middleware-next')).toBe('1')
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(mocks.getUser).toHaveBeenCalledOnce()
    expect(log).toHaveBeenCalledExactlyOnceWith(
      'Supabase session refresh is temporarily unavailable',
    )
  })
})
