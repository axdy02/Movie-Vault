// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PeopleDirectory } from '@/features/discovery/people-directory'
import type { LibraryPerson, VaultData } from '@/types/domain'
import { movie } from '../fixtures/domain'

const navigation = vi.hoisted(() => ({
  params: '',
  pathname: '/actors',
  push: vi.fn(),
}))
vi.mock('next/navigation', () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ push: navigation.push }),
  useSearchParams: () => new URLSearchParams(navigation.params),
}))

const person = (tmdbId: number, name: string): LibraryPerson => ({
  id: `person-${tmdbId}`,
  tmdbId,
  name,
  profilePath: null,
  department: 'Acting',
  biography: null,
  knownFor: [],
  movieIds: [],
  directedMovieIds: [],
})
const vault: VaultData = {
  configured: true,
  movies: [
    movie({
      credits: [
        { ...movie().credits[0], tmdbId: 1, order: 0 },
        { ...movie().credits[0], tmdbId: 2, order: null },
        { ...movie().credits[1], tmdbId: 3 },
      ],
    }),
  ],
  people: [
    person(1, 'Lead Performer'),
    person(2, 'Unknown Billing'),
    person(3, 'A Director'),
  ],
  collections: [],
  events: [],
  editors: [],
}
beforeEach(() => {
  navigation.params = ''
  navigation.pathname = '/actors'
  navigation.push.mockReset()
})
afterEach(cleanup)

describe('people directory URL controls', () => {
  it('preserves sorting when a cast filter is selected', async () => {
    navigation.params = 'sort=rating-desc'
    const user = userEvent.setup()
    render(<PeopleDirectory vault={vault} />)
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Cast positions' }),
      'supporting',
    )
    expect(navigation.push).toHaveBeenCalledWith(
      '/actors?sort=rating-desc&cast=supporting',
      { scroll: false },
    )
    expect(
      screen.getByText(/Cast groups use TMDB billing order/),
    ).toBeInTheDocument()
  })

  it('reads shareable lead filters and returns to All cast through back/forward URL updates', () => {
    navigation.params = 'cast=lead&sort=leads-desc'
    const { rerender } = render(<PeopleDirectory vault={vault} />)
    expect(
      screen.getByRole('combobox', { name: 'Cast positions' }),
    ).toHaveValue('lead')
    expect(
      screen.getByRole('heading', { name: 'Lead Performer' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Unknown Billing' }),
    ).not.toBeInTheDocument()
    navigation.params = ''
    rerender(<PeopleDirectory vault={vault} />)
    expect(
      screen.getByRole('combobox', { name: 'Cast positions' }),
    ).toHaveValue('all')
    expect(
      screen.getByRole('heading', { name: 'Unknown Billing' }),
    ).toBeInTheDocument()
  })

  it('removes the default sort parameter while preserving the active cast filter', async () => {
    navigation.params = 'cast=top-3&sort=rating-desc'
    const user = userEvent.setup()
    render(<PeopleDirectory vault={vault} />)
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Sort by' }),
      'films-desc',
    )
    expect(navigation.push).toHaveBeenCalledWith('/actors?cast=top-3', {
      scroll: false,
    })
  })

  it('offers relevant director sorts without cast filters or lead-role metrics', async () => {
    navigation.pathname = '/directors'
    const user = userEvent.setup()
    render(<PeopleDirectory vault={vault} directors />)
    expect(
      screen.queryByRole('combobox', { name: 'Cast positions' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('option', { name: /Most lead roles/ }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'A Director' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Lead Performer' }),
    ).not.toBeInTheDocument()
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Sort by' }),
      'name-desc',
    )
    expect(navigation.push).toHaveBeenCalledWith('/directors?sort=name-desc', {
      scroll: false,
    })
  })

  it('keeps filters available for a no-match view with a clear reset', async () => {
    navigation.params = 'cast=supporting&sort=rating-desc'
    const user = userEvent.setup()
    render(<PeopleDirectory vault={vault} />)
    expect(
      screen.getByRole('heading', { name: 'A broader view might help.' }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(navigation.push).toHaveBeenCalledWith('/actors?sort=rating-desc', {
      scroll: false,
    })
  })
})
