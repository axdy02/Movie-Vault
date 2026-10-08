// @vitest-environment jsdom
import { render, screen, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { MovieCard } from '@/components/movie/movie-card'
import { movie } from '../fixtures/domain'
afterEach(cleanup)
describe('poster card', () => {
  it('keeps watched movie visible with named per-user status and canonical detail URL', () => {
    const film = movie()
    film.states[0].watched = true
    render(<MovieCard movie={film} />)
    expect(
      screen.getByRole('link', {
        name: /Inception, 2010, watched by Editor A/,
      }),
    ).toHaveAttribute('href', '/movie/27205-inception')
    expect(screen.getByTitle('Average member rating')).toHaveTextContent('8.0')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
  it('renders graceful missing image/year and distinguishes community rating', () => {
    const film = movie({ year: null, states: [], tmdbRating: 7.4 })
    render(<MovieCard movie={film} saved />)
    expect(screen.getByText('Year unknown')).toBeInTheDocument()
    expect(screen.getByTitle('TMDB community rating')).toHaveTextContent('7.4')
    expect(screen.getByText('Saved')).toBeInTheDocument()
  })
})
