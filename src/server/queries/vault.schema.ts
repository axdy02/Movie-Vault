import { z } from 'zod'

const nullableString = z.string().nullable()
const nullableNumber = z.number().nullable()
export const movieDataSchema = z.object({
  tmdbId: z.number().int().positive(),
  title: z.string(),
  originalTitle: nullableString,
  overview: nullableString,
  releaseDate: nullableString,
  year: nullableNumber,
  runtime: nullableNumber,
  language: nullableString,
  posterPath: nullableString,
  backdropPath: nullableString,
  tmdbRating: nullableNumber,
  voteCount: nullableNumber,
  popularity: z.number(),
  genres: z.array(z.object({ id: z.number().int(), name: z.string() })),
  credits: z.array(
    z.object({
      tmdbId: z.number().int().positive(),
      name: z.string(),
      profilePath: nullableString,
      type: z.enum(['cast', 'crew']),
      character: nullableString,
      job: nullableString,
      department: nullableString,
      order: nullableNumber,
    }),
  ),
  countries: z.array(z.string()),
})
const offer = z.object({
  id: z.number().int(),
  name: z.string(),
  logoPath: nullableString,
  priority: z.number(),
})
export const providerDataSchema = z.object({
  region: z.string().regex(/^[A-Z]{2}$/),
  offers: z.object({
    flatrate: z.array(offer),
    free: z.array(offer),
    ads: z.array(offer),
    rent: z.array(offer),
    buy: z.array(offer),
  }),
  link: nullableString,
  fetchedAt: nullableString,
})
export const libraryMovieSchema = movieDataSchema.extend({
  id: z.uuid(),
  saved: z.boolean(),
  addedAt: z.string(),
  addedBy: z.string(),
  addedById: z.uuid(),
  states: z.array(
    z.object({
      userId: z.uuid(),
      displayName: z.string(),
      watched: z.boolean(),
      rating: nullableNumber,
      lastWatchedAt: nullableString,
      watchCount: z.number().int().nonnegative(),
    }),
  ),
  collectionIds: z.array(z.uuid()),
  providers: providerDataSchema.nullable(),
})
const person = z.object({
  tmdbId: z.number().int().positive(),
  name: z.string(),
  profilePath: nullableString,
  department: nullableString,
  biography: nullableString,
  knownFor: z.array(z.string()),
})
export const activityEventSchema = z.object({
  id: z.uuid(),
  actorName: z.string(),
  actorId: nullableString,
  action: z.string(),
  entityType: z.string(),
  movieId: nullableString,
  movieTitle: nullableString,
  collectionId: nullableString,
  collectionName: nullableString,
  sourceSurface: nullableString,
  sourceRoute: nullableString,
  interactionMethod: nullableString,
  createdAt: z.string(),
})
export const activityDataSchema = z.object({
  events: z.array(
    activityEventSchema.extend({
      before: z.record(z.string(), z.unknown()).nullable().optional(),
      after: z.record(z.string(), z.unknown()).nullable().optional(),
    }),
  ),
  total: z.number().int().nonnegative(),
})
export const vaultDataSchema = z.object({
  movies: z.array(libraryMovieSchema),
  people: z.array(
    person.extend({
      id: z.uuid(),
      movieIds: z.array(z.uuid()),
      directedMovieIds: z.array(z.uuid()),
    }),
  ),
  collections: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      slug: z.string(),
      description: nullableString,
      coverMovieId: nullableString,
      pinned: z.boolean(),
      movieIds: z.array(z.uuid()),
      createdAt: z.string(),
    }),
  ),
  events: z.array(activityEventSchema),
  editors: z.array(
    z.object({
      id: z.uuid(),
      displayName: z.string(),
      avatarUrl: nullableString,
    }),
  ),
})
