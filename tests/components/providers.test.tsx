// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { ProviderList } from '@/features/providers/provider-list'
import { movie } from '../fixtures/domain'
vi.mock('@/server/actions/vault.actions', () => ({ mutate: vi.fn() }))
vi.mock('next/navigation', () => ({
  usePathname: () => '/movie/27205-inception',
  useRouter: () => ({ refresh: vi.fn() }),
}))
beforeEach(() => {
  localStorage.clear()
  vi.stubGlobal('fetch', vi.fn())
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})
it('separates regional offer types and uses only the supplied listing link', () => {
  const initial = movie().providers!
  initial.offers.rent = [
    { id: 2, name: 'Test Rentals', logoPath: null, priority: 1 },
  ]
  render(<ProviderList tmdbId={27205} initial={initial} canRefresh={false} />)
  expect(
    screen.getByRole('heading', { name: 'Subscription streaming' }),
  ).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: /^Rent$/ })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Check listings' })).toHaveAttribute(
    'href',
    initial.link,
  )
  expect(screen.getByText('Netflix')).toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: /^Refresh$/ }),
  ).not.toBeInTheDocument()
})
it('changes region and describes unlisted data without claiming global unavailability', async () => {
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
    />,
  )
  await user.selectOptions(
    screen.getByRole('combobox', { name: 'Streaming region' }),
    'US',
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
  expect(screen.queryByText('Netflix')).not.toBeInTheDocument()
})
it('keeps the same-region cached snapshot visible when refresh fails', async () => {
  vi.mocked(fetch).mockRejectedValue(new Error('offline'))
  const user = userEvent.setup()
  const initial = {
    ...movie().providers!,
    error: 'Could not refresh availability. Showing the last checked snapshot.',
  }
  render(<ProviderList tmdbId={27205} initial={initial} canRefresh={false} />)
  await user.click(screen.getByRole('button', { name: 'Retry' }))
  await waitFor(() => expect(fetch).toHaveBeenCalled())
  expect(screen.getByText('Netflix')).toBeInTheDocument()
  await expect(screen.findByRole('alert')).resolves.toHaveTextContent(
    'could not be loaded',
  )
})
