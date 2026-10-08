import { describe, expect, it } from 'vitest'
import {
  tmdbMovieCreditsSchema,
  tmdbMovieDetailsSchema,
  tmdbPersonDetailsSchema,
  tmdbPersonCreditsSchema,
  tmdbWatchProvidersSchema,
} from '@/lib/tmdb/schemas'
import {
  moviePersistencePayload,
  normalizeProviders,
  providerFreshness,
  transformFilmography,
  transformMovie,
  transformPerson,
  transformSearch,
} from '@/lib/tmdb/transforms'

const movie = {
  id: 27205,
  title: 'Inception',
  original_title: 'Inception',
  release_date: '2010-07-15',
  runtime: 148,
  vote_average: 8.4,
  genres: [{ id: 878, name: 'Science Fiction' }],
  production_countries: [
    { iso_3166_1: 'US', name: 'United States of America' },
  ],
}
const personCredit = {
  id: 6193,
  name: 'Leonardo DiCaprio',
  character: 'Cobb',
  order: 0,
}

describe('TMDB movie and person boundaries', () => {
  it('handles missing image, runtime, date and cast without inventing metadata', () => {
    const result = transformMovie(
      tmdbMovieDetailsSchema.parse({
        id: 1,
        title: 'Unknown title',
        release_date: '',
        runtime: 0,
      }),
    )
    expect(result).toMatchObject({
      posterPath: null,
      backdropPath: null,
      runtime: null,
      year: null,
      releaseDate: null,
      credits: [],
      genres: [],
    })
  })

  it('preserves original title and canonical ID while transforming relationships', () => {
    const result = transformMovie(
      tmdbMovieDetailsSchema.parse({
        ...movie,
        original_title: 'Other original title',
      }),
      tmdbMovieCreditsSchema.parse({
        id: movie.id,
        cast: [personCredit],
        crew: [
          {
            id: 525,
            name: 'Christopher Nolan',
            job: 'Director',
            department: 'Directing',
          },
        ],
      }),
    )
    expect(result).toMatchObject({
      tmdbId: movie.id,
      originalTitle: 'Other original title',
      year: 2010,
      runtime: 148,
      countries: ['United States of America'],
    })
    expect(
      result.credits.map((credit) => [
        credit.type,
        credit.character,
        credit.job,
      ]),
    ).toEqual([
      ['cast', 'Cobb', null],
      ['crew', null, 'Director'],
    ])
  })

  it('persists useful top cast and directors without erasing external metadata boundaries', () => {
    const payload = moviePersistencePayload(
      tmdbMovieDetailsSchema.parse(movie),
      tmdbMovieCreditsSchema.parse({
        id: movie.id,
        cast: [personCredit, { ...personCredit, id: 3, order: 20 }],
        crew: [
          {
            id: 525,
            name: 'Christopher Nolan',
            job: 'Director',
            department: 'Directing',
          },
          { id: 4, name: 'Crew', job: 'Producer' },
        ],
      }),
    )
    expect(payload.credits).toHaveLength(2)
    expect(payload.metadata_json.countries).toEqual([
      'United States of America',
    ])
    expect(payload).not.toHaveProperty('rating')
    expect(payload).not.toHaveProperty('is_watched')
  })

  it('transforms a person with missing portrait/biography', () => {
    expect(
      transformPerson(
        tmdbPersonDetailsSchema.parse({ id: 131, name: 'Jake Gyllenhaal' }),
      ),
    ).toEqual({
      tmdbId: 131,
      name: 'Jake Gyllenhaal',
      profilePath: null,
      department: null,
      biography: null,
      knownFor: [],
    })
  })

  it('rejects malformed external IDs and image paths', () => {
    expect(
      tmdbMovieDetailsSchema.safeParse({ id: -1, title: 'Bad' }).success,
    ).toBe(false)
    expect(
      tmdbMovieDetailsSchema.safeParse({
        id: 1,
        title: 'Bad',
        poster_path: 'https://evil.invalid/p.jpg',
      }).success,
    ).toBe(false)
  })
})

describe('search and filmography transforms', () => {
  it('deduplicates movie/person IDs, separates people and ignores unsupported/adult results', () => {
    const result = transformSearch([
      movie,
      movie,
      {
        id: 131,
        name: 'Jake Gyllenhaal',
        known_for_department: 'Acting',
        known_for: [{ title: 'Prisoners' }, { title: 'Nightcrawler' }],
      },
      {
        id: 131,
        name: 'Jake Gyllenhaal',
        known_for_department: 'Acting',
        known_for: [{ title: 'Prisoners' }],
      },
      { id: 99, name: 'TV show', media_type: 'tv' },
      { id: 55, title: 'Adult title', adult: true },
    ])
    expect(result.movies.map((entry) => entry.tmdbId)).toEqual([27205])
    expect(result.people.map((entry) => entry.tmdbId)).toEqual([131])
    expect(result.people[0].knownFor).toEqual(['Prisoners'])
  })

  it('respects the explicit movie search mode', () => {
    expect(
      transformSearch([{ id: 131, name: 'Jake Gyllenhaal' }], 'movie'),
    ).toEqual({ movies: [], people: [] })
  })

  it('keeps cast and directing role separate and deduplicates repeated credits', () => {
    const result = transformFilmography(
      tmdbPersonCreditsSchema.parse({
        id: 1,
        cast: [
          { ...movie, character: 'A' },
          { ...movie, character: 'A' },
        ],
        crew: [
          { ...movie, job: 'Director' },
          { ...movie, job: 'Director' },
          { ...movie, job: 'Writer' },
        ],
      }),
    )
    expect(result).toHaveLength(2)
    expect(result.find((entry) => entry.creditType === 'cast')?.role).toBe('A')
    expect(result.find((entry) => entry.creditType === 'crew')?.role).toBe(
      'Director, Writer',
    )
  })
})

describe('regional provider normalization and freshness', () => {
  const provider = {
    provider_id: 8,
    provider_name: 'Netflix',
    logo_path: '/netflix.jpg',
    display_priority: 1,
  }

  it('deduplicates each category without merging distinct offer types', () => {
    const payload = tmdbWatchProvidersSchema.parse({
      id: 1,
      results: {
        IN: {
          link: 'https://www.themoviedb.org/movie/1/watch?locale=IN',
          flatrate: [provider, provider],
          rent: [provider],
        },
        US: { buy: [{ ...provider, provider_id: 9, provider_name: 'Amazon' }] },
      },
    })
    const india = normalizeProviders(payload, 'IN', '2026-10-01T12:00:00Z')
    expect(india.offers.flatrate).toEqual([
      { id: 8, name: 'Netflix', logoPath: '/netflix.jpg', priority: 1 },
    ])
    expect(india.offers.rent).toHaveLength(1)
    expect(india.offers.buy).toHaveLength(0)
    expect(normalizeProviders(payload, 'US').offers.buy[0].id).toBe(9)
  })

  it('returns unknown/unlisted regional data rather than making worldwide availability claims', () => {
    const result = normalizeProviders(
      tmdbWatchProvidersSchema.parse({ id: 1, results: {} }),
      'IN',
    )
    expect(result.region).toBe('IN')
    expect(result.link).toBeNull()
    expect(
      Object.values(result.offers).every((offers) => offers.length === 0),
    ).toBe(true)
  })

  it('identifies exact 24-hour and 7-day cache boundaries', () => {
    const now = Date.parse('2026-10-08T00:00:00Z')
    expect(providerFreshness(null, now)).toBe('missing')
    expect(providerFreshness('invalid', now)).toBe('missing')
    expect(providerFreshness('2026-10-07T00:00:01Z', now)).toBe('fresh')
    expect(providerFreshness('2026-10-07T00:00:00Z', now)).toBe('stale')
    expect(providerFreshness('2026-10-01T00:00:00Z', now)).toBe('expired')
  })
})
