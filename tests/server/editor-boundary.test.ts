import { beforeEach, describe, expect, it, vi } from 'vitest'
import { executeMutation } from '@/server/mutations/vault.mutations'
import { mutate } from '@/server/actions/vault.actions'
import { safeReturnPath } from '@/lib/auth/return-path'

const mocks = vi.hoisted(() => ({
  createCookieClient: vi.fn(),
  getUser: vi.fn(),
  maybeSingle: vi.fn(),
  rpc: vi.fn(),
  adminClient: vi.fn(),
  fetchMovie: vi.fn(),
  fetchCredits: vi.fn(),
  revalidatePath: vi.fn(),
}))
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: mocks.createCookieClient,
  isSupabaseConfigured: () => true,
}))
vi.mock('@/lib/supabase/admin', () => ({
  createProviderCacheClient: mocks.adminClient,
}))
vi.mock('@/lib/tmdb/client', () => ({
  fetchMovie: mocks.fetchMovie,
  fetchMovieCredits: mocks.fetchCredits,
  fetchWatchProviders: vi.fn(),
}))
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))

const userId = '10000000-0000-4000-8000-000000000001'
const movieId = '20000000-0000-4000-8000-000000000001'
const context = {
  surface: 'movie_detail',
  route: '/movie/1-fixture',
  method: 'button',
}
const rate = { type: 'rate', movieId, rating: 8.5, context }

beforeEach(() => {
  vi.clearAllMocks()
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: mocks.maybeSingle,
  }
  mocks.createCookieClient.mockResolvedValue({
    auth: { getUser: mocks.getUser },
    from: vi.fn().mockReturnValue(chain),
    rpc: mocks.rpc,
  })
  mocks.getUser.mockResolvedValue({
    data: { user: { id: userId } },
    error: null,
  })
  mocks.maybeSingle.mockResolvedValue({
    data: {
      id: userId,
      display_name: 'Member',
      avatar_url: null,
      role: 'editor',
      is_active: true,
    },
    error: null,
  })
  mocks.rpc.mockResolvedValue({ data: null, error: null })
})

describe('server authorization boundary (simulated cookie transport; RLS is tested against Postgres separately)', () => {
  it('validates input before authentication or remote/database work', async () => {
    await expect(
      executeMutation({ ...rate, rating: 8.3 }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' })
    expect(mocks.createCookieClient).not.toHaveBeenCalled()
    expect(mocks.fetchMovie).not.toHaveBeenCalled()
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it.each([null, { message: 'expired session' }])(
    'denies anonymous or expired identity before any mutation',
    async (authError) => {
      mocks.getUser.mockResolvedValue({
        data: { user: null },
        error: authError,
      })
      await expect(
        executeMutation({ type: 'add', tmdbId: 1, context }),
      ).rejects.toMatchObject({ code: 'AUTH_REQUIRED' })
      expect(mocks.maybeSingle).not.toHaveBeenCalled()
      expect(mocks.fetchMovie).not.toHaveBeenCalled()
      expect(mocks.rpc).not.toHaveBeenCalled()
      expect(mocks.adminClient).not.toHaveBeenCalled()
    },
  )

  it.each([
    null,
    { id: userId, role: 'viewer', is_active: true },
    { id: userId, role: 'editor', is_active: false },
  ])('denies a missing, noneditor or inactive profile', async (profile) => {
    mocks.maybeSingle.mockResolvedValue({ data: profile, error: null })
    await expect(executeMutation(rate)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    })
    expect(mocks.rpc).not.toHaveBeenCalled()
    expect(mocks.adminClient).not.toHaveBeenCalled()
  })

  it('uses the verified cookie client for an authorized atomic mutation, never a service-role client', async () => {
    await expect(executeMutation(rate)).resolves.toEqual({
      message: 'Your rating saved.',
    })
    expect(mocks.getUser).toHaveBeenCalledOnce()
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith('vault_rate', {
      p_movie_id: movieId,
      p_rating: 8.5,
      p_context: context,
    })
    expect(mocks.adminClient).not.toHaveBeenCalled()
    expect(mocks.fetchMovie).not.toHaveBeenCalled()
  })

  it('reports transactional failure safely and never claims success or revalidates after failure', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mocks.rpc.mockResolvedValue({
      data: null,
      error: {
        code: 'XX000',
        message: 'SQL internal details and private credential',
      },
    })
    await expect(mutate(rate)).resolves.toEqual({
      ok: false,
      code: 'SAVE_FAILED',
      message: 'The change could not be saved. Please try again.',
    })
    expect(mocks.revalidatePath).not.toHaveBeenCalled()
    expect(mocks.rpc).toHaveBeenCalledOnce()
    vi.restoreAllMocks()
  })
})

describe('login return paths', () => {
  it.each([
    'https://attacker.example',
    '//attacker.example',
    '/\\attacker.example',
    '/\n/attacker.example',
    'javascript:alert(1)',
  ])('rejects external or malformed destinations %s', (value) => {
    expect(safeReturnPath(value)).toBe('/library')
  })
  it('preserves an internal filtered route', () => {
    expect(safeReturnPath('/library?genre=53#movies')).toBe(
      '/library?genre=53#movies',
    )
  })
})
