import { describe, expect, it } from 'vitest'
import {
  derivePeopleDirectory,
  parsePeopleDirectoryParams,
} from '@/features/discovery/people-directory-model'
import type { Credit, LibraryPerson } from '@/types/domain'
import { movie } from '../fixtures/domain'

function person(tmdbId: number, name = `Person ${tmdbId}`): LibraryPerson {
  return {
    id: `person-${tmdbId}`,
    tmdbId,
    name,
    profilePath: null,
    department: 'Acting',
    biography: null,
    knownFor: [],
    movieIds: [],
    directedMovieIds: [],
  }
}
function cast(tmdbId: number, order: number | null): Credit {
  return {
    tmdbId,
    name: `Person ${tmdbId}`,
    type: 'cast',
    order,
    profilePath: null,
    character: 'A character',
    job: null,
    department: 'Acting',
  }
}

describe('people directory derived views', () => {
  it('counts a canonical film and its watch state once despite duplicate movie and person credits', () => {
    const film = movie({
      credits: [cast(1, 0), cast(1, 1)],
      tmdbRating: 8,
      states: movie().states.map((state) => ({
        ...state,
        watched: true,
        watchCount: 10,
      })),
    })
    const entries = derivePeopleDirectory({
      people: [person(1)],
      movies: [film, { ...film }],
    })
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      filmCount: 1,
      leadCount: 1,
      watchedCount: 1,
      averageTmdbRating: 8,
    })
    expect(entries[0].movies).toHaveLength(1)
  })

  it('uses zero-based billing boundaries and keeps unknown billing only in All cast', () => {
    const people = [1, 2, 3, 4, 5, 6].map((id) => person(id))
    const film = movie({
      credits: [
        cast(1, 0),
        cast(2, 2),
        cast(3, 4),
        cast(4, 5),
        cast(5, null),
        cast(6, -1),
      ],
    })
    const vault = { people, movies: [film] }
    const ids = (filter: 'all' | 'lead' | 'top-3' | 'supporting') =>
      derivePeopleDirectory(vault, { cast: filter }).map(
        (entry) => entry.person.tmdbId,
      )
    expect(ids('all')).toEqual([1, 2, 3, 4, 5, 6])
    expect(ids('lead')).toEqual([1, 2, 3])
    expect(ids('top-3')).toEqual([1, 2])
    expect(ids('supporting')).toEqual([4])
  })

  it('includes a person when at least one of their movie credits qualifies', () => {
    const vault = {
      people: [person(1), person(2)],
      movies: [
        movie({
          credits: [cast(1, null), cast(1, 0), cast(2, null), cast(2, 8)],
        }),
      ],
    }
    expect(
      derivePeopleDirectory(vault, { cast: 'lead' }).map(
        (entry) => entry.person.tmdbId,
      ),
    ).toEqual([1])
    expect(
      derivePeopleDirectory(vault, { cast: 'supporting' }).map(
        (entry) => entry.person.tmdbId,
      ),
    ).toEqual([2])
  })

  it('uses only exact directing jobs and excludes assistant directors and cast labels', () => {
    const film = movie({
      credits: [
        { ...cast(1, null), type: 'crew', job: 'Director' },
        { ...cast(2, null), type: 'crew', job: 'Assistant Director' },
        { ...cast(3, null), job: 'Director' },
      ],
    })
    expect(
      derivePeopleDirectory(
        { people: [person(1), person(2), person(3)], movies: [film] },
        { directors: true },
      ).map((entry) => entry.person.tmdbId),
    ).toEqual([1])
  })

  it('excludes removed films and derives all metrics from role-matching films', () => {
    const vault = {
      people: [person(1)],
      movies: [
        movie({ tmdbId: 1, credits: [cast(1, 0)], tmdbRating: 8 }),
        movie({ tmdbId: 2, credits: [cast(1, 8)], tmdbRating: 2 }),
        movie({
          tmdbId: 3,
          credits: [cast(1, 0)],
          saved: false,
          tmdbRating: 10,
        }),
      ],
    }
    expect(derivePeopleDirectory(vault, { cast: 'lead' })[0]).toMatchObject({
      filmCount: 1,
      leadCount: 1,
      averageTmdbRating: 8,
    })
    expect(
      derivePeopleDirectory(vault, { cast: 'supporting' })[0],
    ).toMatchObject({ filmCount: 1, leadCount: 0, averageTmdbRating: 2 })
  })

  it('can prioritize lead-billed film counts separately from total film counts', () => {
    const vault = {
      people: [person(1, 'More films'), person(2, 'More leading credits')],
      movies: [
        movie({ tmdbId: 1, credits: [cast(1, 0), cast(2, 0)] }),
        movie({ tmdbId: 2, credits: [cast(1, 8), cast(2, 4)] }),
        movie({ tmdbId: 3, credits: [cast(1, 8)] }),
      ],
    }
    expect(derivePeopleDirectory(vault)[0].person.tmdbId).toBe(1)
    expect(
      derivePeopleDirectory(vault, { sort: 'leads-desc' })[0].person.tmdbId,
    ).toBe(2)
  })

  it('averages available TMDB ratings and places entirely unrated film sets last', () => {
    const vault = {
      people: [person(1, 'Bravo'), person(2, 'Alpha'), person(3, 'Unlisted')],
      movies: [
        movie({ tmdbId: 1, credits: [cast(1, 0)], tmdbRating: 8 }),
        movie({ tmdbId: 2, credits: [cast(1, 0)], tmdbRating: 10 }),
        movie({
          tmdbId: 3,
          credits: [cast(1, 0), cast(3, 0)],
          tmdbRating: null,
        }),
        movie({ tmdbId: 4, credits: [cast(2, 0)], tmdbRating: 9 }),
      ],
    }
    const entries = derivePeopleDirectory(vault, { sort: 'rating-desc' })
    expect(entries.map((entry) => entry.person.name)).toEqual([
      'Alpha',
      'Bravo',
      'Unlisted',
    ])
    expect(entries.map((entry) => entry.averageTmdbRating)).toEqual([
      9,
      9,
      null,
    ])
  })

  it('sorts watched films rather than rewatch counts and breaks ties by name and ID', () => {
    const watched = movie().states.map((state) => ({
      ...state,
      watched: true,
      watchCount: 100,
    }))
    const vault = {
      people: [person(2, 'Same'), person(1, 'Same'), person(3, 'Zed')],
      movies: [
        movie({
          tmdbId: 1,
          credits: [cast(1, 0), cast(2, 0), cast(3, 0)],
          states: watched,
        }),
        movie({
          tmdbId: 2,
          credits: [cast(1, 0), cast(2, 0)],
          states: watched,
        }),
      ],
    }
    expect(
      derivePeopleDirectory(vault, { sort: 'watched-desc' }).map(
        (entry) => entry.person.tmdbId,
      ),
    ).toEqual([1, 2, 3])
    expect(
      derivePeopleDirectory(vault, { sort: 'name-desc' }).map(
        (entry) => entry.person.tmdbId,
      ),
    ).toEqual([3, 1, 2])
  })

  it('filters person names case-insensitively and handles invalid URL choices with documented defaults', () => {
    expect(
      parsePeopleDirectoryParams(
        new URLSearchParams('cast=invalid&sort=invalid'),
      ),
    ).toEqual({ directors: false, cast: 'all', sort: 'films-desc', q: '' })
    expect(
      parsePeopleDirectoryParams(
        new URLSearchParams('cast=lead&sort=leads-desc'),
        true,
      ),
    ).toEqual({ directors: true, cast: 'all', sort: 'films-desc', q: '' })
    expect(
      parsePeopleDirectoryParams(new URLSearchParams(`q=${'x'.repeat(150)}`)).q,
    ).toHaveLength(120)
    expect(
      derivePeopleDirectory(
        {
          people: [person(1, 'An Actor'), person(2, 'Someone Else')],
          movies: [movie({ credits: [cast(1, 0), cast(2, 0)] })],
        },
        { q: '  ACTOR  ' },
      ).map((entry) => entry.person.name),
    ).toEqual(['An Actor'])
  })
})
