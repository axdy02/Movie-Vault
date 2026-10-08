import { describe, expect, it } from 'vitest'
import {
  averageRating,
  formatDate,
  movieHref,
  slugify,
  watchedAggregate,
} from '@/lib/utils'
import { formatActivity } from '@/lib/audit'
import {
  contextSchema,
  mutationSchema,
  ratingSchema,
} from '@/lib/validation/mutations'
import { activity, movie } from '../fixtures/domain'

describe('personal state domain', () => {
  it('averages only existing ratings, preserving unrated', () => {
    expect(averageRating([null, undefined])).toBeNull()
    expect(averageRating([8.5, null, 9])).toBe(8.75)
  })
  it('distinguishes every two-editor watched state', () => {
    expect(watchedAggregate([{ watched: false }, { watched: false }])).toBe(
      'neither',
    )
    expect(watchedAggregate([{ watched: true }, { watched: false }])).toBe(
      'userA',
    )
    expect(watchedAggregate([{ watched: false }, { watched: true }])).toBe(
      'userB',
    )
    expect(watchedAggregate([{ watched: true }, { watched: true }])).toBe(
      'both',
    )
    expect(watchedAggregate([{ watched: true }])).toBe('userA')
  })
  it.each([0, 0.25, 10.5, -1, 8.1, NaN, Infinity])(
    'rejects invalid rating %s',
    (value) => {
      expect(ratingSchema.safeParse(value).success).toBe(false)
    },
  )
  it.each([null, 0.5, 8.5, 10])('accepts rating/removal %s', (value) => {
    expect(ratingSchema.safeParse(value).success).toBe(true)
  })
})
describe('safe inputs and URLs', () => {
  it('produces safe Unicode fallback slugs and TMDB identity URLs', () => {
    expect(slugify('Léon: The Professional')).toBe('leon-the-professional')
    expect(slugify('🎬')).toBe('untitled')
    expect(movieHref(movie())).toBe('/movie/27205-inception')
  })
  it('rejects unsafe context routes and input ids', () => {
    expect(
      contextSchema.safeParse({
        surface: 'global_search',
        route: '//evil.test',
        method: 'button',
      }).success,
    ).toBe(false)
    expect(
      mutationSchema.safeParse({
        type: 'remove',
        movieId: 'fake',
        context: {
          surface: 'movie_detail',
          route: '/movie/1',
          method: 'button',
        },
      }).success,
    ).toBe(false)
  })
  it('requires full offset watch timestamps and rejects overlong notes', () => {
    const context = {
      surface: 'movie_detail',
      route: '/movie/1',
      method: 'button',
    }
    expect(
      mutationSchema.safeParse({
        type: 'watch',
        movieId: movie().id,
        watched: true,
        watchedAt: '2026-10-08',
        context,
      }).success,
    ).toBe(false)
    expect(
      mutationSchema.safeParse({
        type: 'note',
        movieId: movie().id,
        note: 'x'.repeat(5001),
        context,
      }).success,
    ).toBe(false)
  })
  it('formats invalid dates safely and uses India time for activity', () => {
    expect(formatDate('bad')).toBe('Unknown date')
    expect(formatDate('2026-10-07T20:00:00Z')).toContain('8 Oct 2026')
  })
})
describe('activity formatting', () => {
  it('renders collection context and rating changes without raw JSON', () => {
    expect(
      formatActivity(
        activity({
          action: 'collection.movie_added',
          collectionName: 'Sunday films',
        }),
      ),
    ).toBe('Editor A added Inception to Sunday films')
    expect(
      formatActivity(
        activity({
          action: 'rating.changed',
          before: { rating: 8.5, note: 'private' },
          after: { rating: 9 },
        }),
      ),
    ).toBe('Editor A changed a rating for Inception from 8.5 to 9')
  })
  it('keeps notes at metadata level', () => {
    expect(
      formatActivity(
        activity({ action: 'note.updated', after: { note: 'do not show' } }),
      ),
    ).not.toContain('do not show')
  })
})
