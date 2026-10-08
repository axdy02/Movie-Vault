// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CollectionForm } from '@/features/collections/collection-form'
import { CollectionMembershipButton } from '@/features/collections/membership-button'
import type { ActionResult, CollectionData } from '@/types/domain'
import { movie } from '../fixtures/domain'

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  refresh: vi.fn(),
  push: vi.fn(),
}))
vi.mock('@/server/actions/vault.actions', () => ({ mutate: mocks.mutate }))
vi.mock('next/navigation', () => ({
  usePathname: () => '/collections/sunday-films',
  useRouter: () => ({ refresh: mocks.refresh, push: mocks.push }),
}))
afterEach(cleanup)
beforeEach(() => {
  vi.clearAllMocks()
})
const collection: CollectionData = {
  id: '00000000-0000-4000-8000-000000000030',
  name: 'Sunday films',
  slug: 'sunday-films',
  description: 'For a quiet evening',
  coverMovieId: null,
  pinned: false,
  movieIds: [movie().id],
  createdAt: '2026-10-08T00:00:00Z',
}

describe('collection editing feedback', () => {
  it('submits validated form fields with source context and shows a real pending/success state', async () => {
    let resolve: (result: ActionResult) => void = () => undefined
    mocks.mutate.mockImplementation(
      () =>
        new Promise<ActionResult>((complete) => {
          resolve = complete
        }),
    )
    const user = userEvent.setup()
    render(<CollectionForm />)
    await user.click(screen.getByRole('button', { name: 'New collection' }))
    await user.type(screen.getByLabelText('Collection name'), 'Sunday films')
    await user.type(screen.getByLabelText(/Description/), 'For a quiet evening')
    await user.click(screen.getByRole('button', { name: 'Create collection' }))
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled()
    expect(mocks.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'collection',
        name: 'Sunday films',
        description: 'For a quiet evening',
        coverMovieId: null,
        context: {
          surface: 'collection_editor',
          route: '/collections/sunday-films',
          method: 'button',
        },
      }),
    )
    await act(async () =>
      resolve({ ok: true, message: 'Collection created.', id: collection.id }),
    )
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )
    expect(screen.getByRole('status')).toHaveTextContent('Collection created.')
    expect(mocks.refresh).toHaveBeenCalledOnce()
  })

  it('preserves form values and keeps the dialog open when saving fails', async () => {
    mocks.mutate.mockResolvedValue({
      ok: false,
      message: 'The change could not be saved. Please try again.',
    })
    const user = userEvent.setup()
    render(<CollectionForm collection={collection} />)
    await user.click(screen.getByRole('button', { name: 'Edit collection' }))
    await user.click(screen.getByRole('button', { name: 'Save collection' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The change could not be saved.',
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText('Collection name')).toHaveValue('Sunday films')
    expect(
      screen.getByRole('button', { name: 'Save collection' }),
    ).toBeEnabled()
    expect(mocks.refresh).not.toHaveBeenCalled()
  })

  it('offers a backdrop only from a collection member with artwork', async () => {
    const user = userEvent.setup()
    render(
      <CollectionForm
        collection={collection}
        movies={[
          movie({ backdropPath: '/inception.jpg' }),
          movie({
            id: '00000000-0000-4000-8000-000000000011',
            title: 'Other',
            backdropPath: '/other.jpg',
          }),
        ]}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Edit collection' }))
    expect(
      screen.getByRole('option', { name: 'Inception backdrop' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('option', { name: 'Other backdrop' }),
    ).not.toBeInTheDocument()
  })

  it('allows membership retry after failure and settles against server success', async () => {
    mocks.mutate
      .mockResolvedValueOnce({ ok: false, message: 'Please try again.' })
      .mockResolvedValueOnce({
        ok: true,
        message: 'Movie added to collection.',
      })
    const user = userEvent.setup()
    render(
      <CollectionMembershipButton
        collectionId={collection.id}
        movieId={movie().id}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Add to collection' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Please try again.',
    )
    await user.click(screen.getByRole('button', { name: 'Add to collection' }))
    expect(await screen.findByRole('button', { name: 'Added' })).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent(
      'Movie added to collection.',
    )
  })
})
