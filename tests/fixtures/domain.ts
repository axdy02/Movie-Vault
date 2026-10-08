import type { ActivityEvent, LibraryMovie } from '@/types/domain'
export const editorA = '00000000-0000-4000-8000-000000000001'
export const editorB = '00000000-0000-4000-8000-000000000002'
export function movie(overrides: Partial<LibraryMovie> = {}): LibraryMovie {
  return {
    id: '00000000-0000-4000-8000-000000000010',
    tmdbId: 27205,
    title: 'Inception',
    originalTitle: 'Inception',
    overview: 'A test movie.',
    releaseDate: '2010-07-16',
    year: 2010,
    runtime: 148,
    language: 'en',
    posterPath: null,
    backdropPath: null,
    tmdbRating: 8.4,
    voteCount: 42,
    popularity: 100,
    genres: [{ id: 53, name: 'Thriller' }],
    credits: [
      {
        tmdbId: 6193,
        name: 'Leonardo DiCaprio',
        profilePath: null,
        type: 'cast',
        character: 'Cobb',
        job: null,
        department: 'Acting',
        order: 0,
      },
      {
        tmdbId: 525,
        name: 'Christopher Nolan',
        profilePath: null,
        type: 'crew',
        character: null,
        job: 'Director',
        department: 'Directing',
        order: null,
      },
    ],
    countries: ['US'],
    saved: true,
    addedAt: '2026-10-07T12:00:00Z',
    addedBy: 'Editor A',
    addedById: editorA,
    states: [
      {
        userId: editorA,
        displayName: 'Editor A',
        watched: false,
        rating: 8,
        lastWatchedAt: null,
        watchCount: 0,
      },
      {
        userId: editorB,
        displayName: 'Editor B',
        watched: false,
        rating: null,
        lastWatchedAt: null,
        watchCount: 0,
      },
    ],
    collectionIds: ['00000000-0000-4000-8000-000000000030'],
    providers: {
      region: 'IN',
      link: 'https://www.themoviedb.org/movie/27205/watch?locale=IN',
      fetchedAt: '2026-10-08T00:00:00Z',
      offers: {
        flatrate: [{ id: 8, name: 'Netflix', logoPath: null, priority: 0 }],
        free: [],
        ads: [],
        rent: [],
        buy: [],
      },
    },
    ...overrides,
  }
}
export function activity(
  overrides: Partial<ActivityEvent> = {},
): ActivityEvent {
  return {
    id: 'event',
    actorName: 'Editor A',
    actorId: editorA,
    action: 'movie.added',
    entityType: 'movie',
    movieId: 'movie',
    movieTitle: 'Inception',
    collectionId: null,
    collectionName: null,
    sourceSurface: 'global_search',
    sourceRoute: '/search',
    interactionMethod: 'button',
    createdAt: '2026-10-08T00:00:00Z',
    ...overrides,
  }
}
