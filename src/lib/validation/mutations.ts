import { z } from 'zod'
const uuid = z.uuid()
export const tmdbIdSchema = z.coerce
  .number()
  .int()
  .positive()
  .max(Number.MAX_SAFE_INTEGER)
export const regionSchema = z.string().regex(/^[A-Z]{2}$/)
export const ratingSchema = z
  .number()
  .min(0.5)
  .max(10)
  .multipleOf(0.5)
  .nullable()
export const contextSchema = z.object({
  surface: z.enum([
    'global_search',
    'movie_detail',
    'person_filmography',
    'collection_editor',
    'library_grid',
    'random_picker',
    'settings',
    'other',
  ]),
  route: z
    .string()
    .max(250)
    .regex(/^\/(?!\/)/),
  method: z.enum(['button', 'keyboard', 'bulk_action', 'server_refresh']),
  query: z.string().max(120).optional(),
  personTmdbId: tmdbIdSchema.optional(),
})
const base = { context: contextSchema }
export const mutationSchema = z.discriminatedUnion('type', [
  z.object({
    ...base,
    type: z.literal('add'),
    tmdbId: tmdbIdSchema,
    collectionId: uuid.optional(),
  }),
  z.object({ ...base, type: z.literal('remove'), movieId: uuid }),
  z.object({
    ...base,
    type: z.literal('watch'),
    movieId: uuid,
    watched: z.boolean(),
    watchedAt: z.iso.datetime({ offset: true }).optional(),
    rewatch: z.boolean().optional(),
  }),
  z.object({
    ...base,
    type: z.literal('correct_watch'),
    eventId: uuid,
    watchedAt: z.iso.datetime({ offset: true }),
  }),
  z.object({
    ...base,
    type: z.literal('rate'),
    movieId: uuid,
    rating: ratingSchema,
  }),
  z.object({
    ...base,
    type: z.literal('collection'),
    id: uuid.optional(),
    name: z.string().trim().min(1).max(80),
    description: z.string().trim().max(1000).default(''),
    coverMovieId: uuid.nullable().optional(),
    archive: z.boolean().optional(),
  }),
  z.object({
    ...base,
    type: z.literal('membership'),
    collectionId: uuid,
    movieId: uuid,
    remove: z.boolean().default(false),
  }),
  z.object({
    ...base,
    type: z.literal('refresh_metadata'),
    movieId: uuid,
    tmdbId: tmdbIdSchema,
  }),
  z.object({
    ...base,
    type: z.literal('refresh_providers'),
    movieId: uuid,
    tmdbId: tmdbIdSchema,
    region: regionSchema.default('IN'),
  }),
  z.object({
    ...base,
    type: z.literal('note'),
    movieId: uuid,
    note: z.string().max(5000).nullable(),
  }),
])
export type MutationInput = z.infer<typeof mutationSchema>
