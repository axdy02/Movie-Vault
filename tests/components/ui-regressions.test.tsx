// @vitest-environment jsdom
import { StrictMode } from 'react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ProviderList } from '@/features/providers/provider-list'
import { WatchDialog } from '@/features/watch-history/watch-dialog'
import { Filmography } from '@/features/discovery/filmography'
import { REGION_STORAGE_KEY } from '@/lib/regions'
import { movie } from '../fixtures/domain'

const transport = vi.hoisted(() => ({
  mutate: vi.fn(),
  refresh: vi.fn(),
  params: 'role=director',
}))
vi.mock('@/server/actions/vault.actions', () => ({ mutate: transport.mutate }))
vi.mock('next/navigation', () => ({
  usePathname: () => '/movie/27205-inception',
  useRouter: () => ({ refresh: transport.refresh, push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(transport.params),
}))

beforeEach(() => {
  localStorage.clear()
  transport.mutate.mockReset()
  transport.refresh.mockReset()
  vi.stubGlobal('fetch', vi.fn())
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('tracking and discovery regressions', () => {
  it('records a past screening even when current watched state is already true', async () => {
    transport.mutate.mockResolvedValue({ ok: true, message: 'Watch recorded.' })
    const user = userEvent.setup()
    render(<WatchDialog movieId={movie().id} />)
    await user.click(
      screen.getByRole('button', { name: 'Record a past watch' }),
    )
    await user.type(
      screen.getByLabelText('Watched date and time'),
      '2026-10-01T20:00',
    )
    await user.click(screen.getByRole('button', { name: 'Record watch' }))
    await waitFor(() =>
      expect(transport.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'watch',
          watched: true,
          rewatch: true,
        }),
      ),
    )
    await expect(screen.findByRole('status')).resolves.toHaveTextContent(
      'Watch recorded.',
    )
  })

  it('restores a viewing region in Strict Mode and fetches the matching regional listings', async () => {
    localStorage.setItem(REGION_STORAGE_KEY, 'US')
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          region: 'US',
          offers: { flatrate: [], free: [], ads: [], rent: [], buy: [] },
          link: null,
          fetchedAt: '2026-10-08T12:00:00Z',
        }),
      ),
    )
    render(
      <StrictMode>
        <ProviderList
          tmdbId={27205}
          initial={movie().providers!}
          canRefresh={false}
        />
      </StrictMode>,
    )
    await waitFor(() =>
      expect(
        screen.getByRole('combobox', { name: 'Streaming region' }),
      ).toHaveValue('US'),
    )
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        '/api/tmdb/movie/27205/providers?region=US',
        expect.any(Object),
      ),
    )
    await expect(
      screen.findByText(/not currently listed for United States/),
    ).resolves.toBeInTheDocument()
  })

  it('gives a shared URL region priority over a stored preference', async () => {
    localStorage.setItem(REGION_STORAGE_KEY, 'US')
    render(
      <StrictMode>
        <ProviderList
          tmdbId={27205}
          initial={movie().providers!}
          canRefresh={false}
          useStoredPreference={false}
        />
      </StrictMode>,
    )
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(
      screen.getByRole('combobox', { name: 'Streaming region' }),
    ).toHaveValue('IN')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('restores the original regional snapshot after browsing another country', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          region: 'US',
          offers: { flatrate: [], free: [], ads: [], rent: [], buy: [] },
          link: null,
          fetchedAt: '2026-10-08T12:00:00Z',
        }),
      ),
    )
    const user = userEvent.setup()
    render(
      <ProviderList
        tmdbId={27205}
        initial={movie().providers!}
        canRefresh={false}
        useStoredPreference={false}
      />,
    )
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Streaming region' }),
      'US',
    )
    await expect(
      screen.findByText(/not currently listed for United States/),
    ).resolves.toBeInTheDocument()
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Streaming region' }),
      'IN',
    )
    expect(screen.getByText('Netflix')).toBeInTheDocument()
    expect(
      screen.queryByText(/not currently listed for India/),
    ).not.toBeInTheDocument()
    expect(screen.queryByText(/Checking listings/)).not.toBeInTheDocument()
  })

  it('shows a newer server snapshot after route revalidation', () => {
    const initial = movie().providers!
    const { rerender } = render(
      <ProviderList
        tmdbId={27205}
        initial={initial}
        canRefresh={false}
        useStoredPreference={false}
      />,
    )
    expect(screen.getByText('Netflix')).toBeInTheDocument()
    const refreshed = {
      ...initial,
      fetchedAt: '2026-10-09T12:00:00Z',
      offers: {
        ...initial.offers,
        flatrate: [{ id: 9, name: 'Prime Video', logoPath: null, priority: 1 }],
      },
    }
    rerender(
      <ProviderList
        tmdbId={27205}
        initial={refreshed}
        canRefresh={false}
        useStoredPreference={false}
      />,
    )
    expect(screen.getByText('Prime Video')).toBeInTheDocument()
    expect(screen.queryByText('Netflix')).not.toBeInTheDocument()
  })

  it('keeps assistant-director jobs out of directing filmography while recognizing combined exact jobs', () => {
    const person = {
      tmdbId: 525,
      name: 'A director',
      profilePath: null,
      department: 'Directing',
      biography: null,
      knownFor: [],
    }
    const directed = {
      ...movie({ title: 'Directed film', tmdbId: 1 }),
      creditType: 'crew' as const,
      role: 'Producer, Director',
    }
    const assisted = {
      ...movie({ title: 'Assisted film', tmdbId: 2 }),
      creditType: 'crew' as const,
      role: 'Assistant Director',
    }
    render(
      <Filmography
        person={person}
        movies={[directed, assisted]}
        library={[]}
        editor={null}
      />,
    )
    expect(
      screen.getByRole('heading', { name: 'Directed film' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Assisted film' }),
    ).not.toBeInTheDocument()
  })
})
