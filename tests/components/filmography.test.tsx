// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { Filmography } from '@/features/discovery/filmography'
import type { FilmographyMovie, PersonData } from '@/types/domain'
import { movie } from '../fixtures/domain'

const navigation = vi.hoisted(() => ({
  params: 'role=actor&sort=year&page=2',
  push: vi.fn(),
}))
vi.mock('next/navigation', () => ({
  usePathname: () => '/people/525-christopher-nolan',
  useSearchParams: () => new URLSearchParams(navigation.params),
  useRouter: () => ({ push: navigation.push, refresh: vi.fn() }),
}))
vi.mock('@/server/actions/vault.actions', () => ({ mutate: vi.fn() }))

const person: PersonData = {
  tmdbId: 525,
  name: 'Christopher Nolan',
  profilePath: null,
  department: 'Directing',
  biography: null,
  knownFor: [],
}
const films: FilmographyMovie[] = [
  {
    ...movie({ tmdbId: 1, title: 'Zulu' }),
    creditType: 'cast',
    role: 'An actor',
  },
  {
    ...movie({ tmdbId: 2, title: 'Alpha' }),
    creditType: 'cast',
    role: 'Another actor',
  },
  {
    ...movie({ tmdbId: 3, title: 'Directed film' }),
    creditType: 'crew',
    role: 'Producer, Director',
  },
  {
    ...movie({ tmdbId: 4, title: 'Assisted film' }),
    creditType: 'crew',
    role: 'Assistant Director',
  },
]
beforeEach(() => {
  navigation.push.mockReset()
  navigation.params = 'role=actor&sort=year&page=2'
})
afterEach(cleanup)

it('updates each expanded sort in the URL while preserving role and clearing pagination', async () => {
  const user = userEvent.setup()
  render(
    <Filmography person={person} movies={films} library={[]} editor={null} />,
  )
  const select = screen.getByRole('combobox', { name: 'Sort filmography' })
  expect(select).toHaveValue('year')
  for (const sort of ['year-asc', 'title-asc', 'title-desc']) {
    await user.selectOptions(select, sort)
    expect(navigation.push).toHaveBeenLastCalledWith(
      `/people/525-christopher-nolan?role=actor&sort=${sort}`,
      { scroll: false },
    )
  }
  expect(
    screen.queryByRole('button', { name: /Add to vault/ }),
  ).not.toBeInTheDocument()
})

it('renders the selected alphabetical order and resets the page when choosing directing credits', async () => {
  navigation.params = 'role=actor&sort=title-asc&page=2'
  const user = userEvent.setup()
  render(
    <Filmography person={person} movies={films} library={[]} editor={null} />,
  )
  expect(
    screen
      .getAllByRole('heading', { level: 3 })
      .map((heading) => heading.textContent),
  ).toEqual(['Alpha', 'Zulu'])
  expect(
    screen.queryByRole('heading', { name: 'Directed film' }),
  ).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Directing' }))
  expect(navigation.push).toHaveBeenCalledWith(
    '/people/525-christopher-nolan?role=director&sort=title-asc',
    { scroll: false },
  )
})
