// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SavedPersonMovies } from '@/features/discovery/saved-person-movies'
import { editorA, movie } from '../fixtures/domain'

const navigation = vi.hoisted(() => ({ params: '', push: vi.fn() }))
vi.mock('next/navigation', () => ({
  usePathname: () => '/people/6193-a-performer',
  useRouter: () => ({ push: navigation.push }),
  useSearchParams: () => new URLSearchParams(navigation.params),
}))
const first = movie({
  tmdbId: 1,
  title: 'First film',
  addedAt: '2026-10-07T12:00:00Z',
  tmdbRating: 8,
})
const second = movie({
  tmdbId: 2,
  title: 'Second film',
  addedAt: '2026-10-08T12:00:00Z',
  tmdbRating: 9,
})
const titles = () =>
  screen
    .getAllByRole('heading', { level: 3 })
    .map((heading) => heading.textContent)
beforeEach(() => {
  navigation.params = ''
  navigation.push.mockReset()
})
afterEach(cleanup)

describe('saved person movie sorting', () => {
  it('preserves filmography sort, role, and page when changing saved sorting', async () => {
    navigation.params = 'role=director&sort=popular&page=7&savedPage=2'
    const user = userEvent.setup()
    render(<SavedPersonMovies movies={[first, second]} personTmdbId={6193} />)
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Sort saved films' }),
      'popular-desc',
    )
    expect(navigation.push).toHaveBeenCalledWith(
      '/people/6193-a-performer?role=director&sort=popular&page=7&savedSort=popular-desc',
      { scroll: false },
    )
  })

  it('honors saved sorting independently of the global filmography sort', () => {
    navigation.params = 'sort=year&savedSort=rating-desc'
    render(
      <SavedPersonMovies
        movies={[
          first,
          second,
          movie({ tmdbId: 3, title: 'Unrated film', tmdbRating: null }),
        ]}
        personTmdbId={6193}
      />,
    )
    expect(
      screen.getByRole('combobox', { name: 'Sort saved films' }),
    ).toHaveValue('rating-desc')
    expect(titles()).toEqual(['Second film', 'First film', 'Unrated film'])
  })

  it('uses recently added as the safe default and restores controls after URL back/forward', () => {
    navigation.params = 'sort=rating&savedSort=invalid'
    const { rerender } = render(
      <SavedPersonMovies movies={[first, second]} personTmdbId={6193} />,
    )
    expect(
      screen.getByRole('combobox', { name: 'Sort saved films' }),
    ).toHaveValue('added-desc')
    expect(titles()).toEqual(['Second film', 'First film'])
    navigation.params = 'sort=rating&savedSort=title-asc'
    rerender(<SavedPersonMovies movies={[first, second]} personTmdbId={6193} />)
    expect(
      screen.getByRole('combobox', { name: 'Sort saved films' }),
    ).toHaveValue('title-asc')
    expect(titles()).toEqual(['First film', 'Second film'])
  })

  it('sorts an editor’s personal ratings rather than the public member average', () => {
    navigation.params = 'savedSort=personal-desc'
    const ownLower = movie({
      tmdbId: 1,
      title: 'Higher public average',
      states: movie().states.map((state) => ({
        ...state,
        rating: state.userId === editorA ? 3 : 10,
      })),
    })
    const ownHigher = movie({
      tmdbId: 2,
      title: 'Higher own rating',
      states: movie().states.map((state) => ({
        ...state,
        rating: state.userId === editorA ? 4 : null,
      })),
    })
    const { rerender } = render(
      <SavedPersonMovies
        movies={[ownLower, ownHigher]}
        personTmdbId={6193}
        currentUserId={editorA}
      />,
    )
    expect(
      screen.getByRole('option', { name: 'Your rating' }),
    ).toBeInTheDocument()
    expect(titles()).toEqual(['Higher own rating', 'Higher public average'])
    rerender(
      <SavedPersonMovies movies={[ownLower, ownHigher]} personTmdbId={6193} />,
    )
    expect(titles()).toEqual(['Higher public average', 'Higher own rating'])
  })

  it('retains cast character context and exact directing jobs with each saved film', () => {
    const credits = [
      ...movie().credits,
      { ...movie().credits[0], tmdbId: 999, character: 'Other performer' },
      { ...movie().credits[1], job: 'Assistant Director' },
    ]
    const { rerender } = render(
      <SavedPersonMovies movies={[movie({ credits })]} personTmdbId={6193} />,
    )
    expect(screen.getByText('Cobb')).toBeInTheDocument()
    expect(screen.queryByText('Other performer')).not.toBeInTheDocument()
    rerender(
      <SavedPersonMovies
        movies={[movie({ credits })]}
        personTmdbId={525}
        director
      />,
    )
    expect(screen.getByText('Director', { exact: true })).toBeInTheDocument()
    expect(
      screen.queryByText('Assistant Director', { exact: true }),
    ).not.toBeInTheDocument()
  })

  it('removes default saved sorting without resetting broader filmography state', async () => {
    navigation.params = 'role=actor&sort=saved&page=2&savedSort=year-asc'
    const user = userEvent.setup()
    render(<SavedPersonMovies movies={[first]} personTmdbId={6193} />)
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Sort saved films' }),
      'added-desc',
    )
    expect(navigation.push).toHaveBeenCalledWith(
      '/people/6193-a-performer?role=actor&sort=saved&page=2',
      { scroll: false },
    )
  })
})
