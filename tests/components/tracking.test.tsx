// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RatingControl } from '@/features/ratings/rating-control'
import { WatchDialog } from '@/features/watch-history/watch-dialog'
import { movie } from '../fixtures/domain'
const transport = vi.hoisted(() => ({ mutate: vi.fn(), refresh: vi.fn() }))
vi.mock('@/server/actions/vault.actions', () => ({ mutate: transport.mutate }))
vi.mock('next/navigation', () => ({
  usePathname: () => '/movie/27205-inception',
  useRouter: () => ({ refresh: transport.refresh }),
}))
beforeEach(() => {
  transport.mutate.mockReset()
  transport.refresh.mockReset()
})
afterEach(cleanup)
describe('personal tracking controls', () => {
  it('saves exact half-step rating then offers explicit unrated removal', async () => {
    transport.mutate.mockResolvedValue({
      ok: true,
      message: 'Your rating saved.',
    })
    const user = userEvent.setup()
    render(<RatingControl movieId={movie().id} rating={8} watched />)
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Your rating out of 10' }),
      '8.5',
    )
    await user.click(screen.getByRole('button', { name: 'Save rating' }))
    await waitFor(() =>
      expect(transport.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'rate',
          rating: 8.5,
          movieId: movie().id,
        }),
      ),
    )
    expect(screen.getByRole('status')).toHaveTextContent('Your rating saved.')
    await user.selectOptions(screen.getByRole('combobox'), '')
    await user.click(screen.getByRole('button', { name: 'Save rating' }))
    await waitFor(() =>
      expect(transport.mutate).toHaveBeenLastCalledWith(
        expect.objectContaining({ rating: null }),
      ),
    )
  })
  it('communicates recoverable failure without claiming success', async () => {
    transport.mutate.mockResolvedValue({
      ok: false,
      message: 'The change could not be saved. Please try again.',
    })
    const user = userEvent.setup()
    render(<RatingControl movieId={movie().id} rating={null} watched={false} />)
    await user.selectOptions(screen.getByRole('combobox'), '9')
    await user.click(screen.getByRole('button', { name: 'Save rating' }))
    await expect(screen.findByRole('alert')).resolves.toHaveTextContent(
      'Please try again',
    )
    expect(transport.refresh).not.toHaveBeenCalled()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Save rating' })).toBeEnabled(),
    )
  })
  it('records explicit past screenings with an ISO viewing date', async () => {
    transport.mutate.mockResolvedValue({
      ok: true,
      message: 'Another watch recorded.',
    })
    const user = userEvent.setup()
    render(<WatchDialog movieId={movie().id} rewatch />)
    await user.click(screen.getByRole('button', { name: 'Record a rewatch' }))
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
          watchedAt: expect.stringMatching(/^2026-10-01T/),
        }),
      ),
    )
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )
  })
})
