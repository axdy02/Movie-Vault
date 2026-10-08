// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GenreDirectory } from '@/features/discovery/genre-directory'
import { CollectionDirectory } from '@/features/collections/collection-directory'
import type { CollectionData } from '@/types/domain'
import { movie } from '../fixtures/domain'

const navigation = vi.hoisted(() => ({
  pathname: '/genres',
  params: '',
  push: vi.fn(),
}))
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(navigation.params),
  usePathname: () => navigation.pathname,
  useRouter: () => ({ push: navigation.push }),
}))

beforeEach(() => {
  navigation.pathname = '/genres'
  navigation.params = ''
  navigation.push.mockReset()
})
afterEach(cleanup)

function collection(
  id: string,
  name: string,
  movieIds: string[],
  pinned = false,
): CollectionData {
  return {
    id,
    name,
    slug: id,
    movieIds,
    pinned,
    description: null,
    coverMovieId: null,
    createdAt: '2026-10-08T00:00:00Z',
  }
}
const films = [
  movie({
    id: 'action',
    tmdbId: 1,
    tmdbRating: 4,
    genres: [{ id: 1, name: 'Action' }],
  }),
  movie({
    id: 'drama',
    tmdbId: 2,
    tmdbRating: 9,
    genres: [{ id: 2, name: 'Drama' }],
  }),
]

describe('category directory URL sorting', () => {
  it('renders shared genre sort from the URL and persists changes while preserving other query choices', async () => {
    navigation.params = 'sort=rating-desc&region=IN&page=2'
    const user = userEvent.setup()
    const view = render(<GenreDirectory movies={films} />)
    expect(screen.getByRole('combobox', { name: 'Sort genres' })).toHaveValue(
      'rating-desc',
    )
    expect(
      screen
        .getAllByRole('heading', { level: 2 })
        .map((entry) => entry.textContent),
    ).toEqual(['Drama', 'Action'])
    expect(screen.getByRole('link', { name: /Drama/ })).toHaveAttribute(
      'href',
      '/library?genre=2',
    )
    expect(
      screen.getByText(/Ranked by average TMDB rating/),
    ).toBeInTheDocument()
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Sort genres' }),
      'name-asc',
    )
    expect(navigation.push).toHaveBeenCalledWith(
      '/genres?sort=name-asc&region=IN',
      { scroll: false },
    )
    navigation.params = 'sort=name-asc&region=IN'
    view.rerender(<GenreDirectory movies={films} />)
    expect(
      screen
        .getAllByRole('heading', { level: 2 })
        .map((entry) => entry.textContent),
    ).toEqual(['Action', 'Drama'])
  })

  it('uses a usable default for invalid genre sort and offers discovery when there are no categories', () => {
    navigation.params = 'sort=invalid'
    render(<GenreDirectory movies={[]} />)
    expect(screen.getByRole('combobox', { name: 'Sort genres' })).toHaveValue(
      'films-desc',
    )
    expect(
      screen.getByRole('link', { name: 'Explore movies' }),
    ).toHaveAttribute('href', '/search')
  })

  it('keeps pinned collection order by default and exposes rating sorting as a public URL control', async () => {
    navigation.pathname = '/collections'
    const collections = [
      collection('action', 'Action shelf', ['action']),
      collection('drama', 'Drama shelf', ['drama'], true),
    ]
    const user = userEvent.setup()
    const view = render(
      <CollectionDirectory collections={collections} movies={films} />,
    )
    expect(
      screen.getByRole('combobox', { name: 'Sort collections' }),
    ).toHaveValue('pinned')
    expect(
      screen
        .getAllByRole('heading', { level: 3 })
        .map((entry) => entry.textContent),
    ).toEqual(['Drama shelf', 'Action shelf'])
    expect(
      screen.queryByRole('button', { name: /New collection/ }),
    ).not.toBeInTheDocument()
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Sort collections' }),
      'rating-desc',
    )
    expect(navigation.push).toHaveBeenCalledWith(
      '/collections?sort=rating-desc',
      { scroll: false },
    )
    navigation.params = 'sort=rating-desc'
    view.rerender(
      <CollectionDirectory collections={collections} movies={films} />,
    )
    expect(
      screen
        .getAllByRole('heading', { level: 3 })
        .map((entry) => entry.textContent),
    ).toEqual(['Drama shelf', 'Action shelf'])
    expect(
      screen.getByRole('option', { name: 'Recently created' }),
    ).toBeInTheDocument()
  })

  it('preserves distinct public and editor collection empty states', () => {
    navigation.pathname = '/collections'
    const view = render(<CollectionDirectory collections={[]} movies={[]} />)
    expect(
      screen.getByText(/Collections will appear here as the members curate/),
    ).toBeInTheDocument()
    view.rerender(<CollectionDirectory collections={[]} movies={[]} canEdit />)
    expect(
      screen.getByText(/Create a collection, then fill it/),
    ).toBeInTheDocument()
  })
})
