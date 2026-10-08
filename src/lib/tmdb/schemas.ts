import { z } from 'zod'

const optionalText = z
  .string()
  .nullish()
  .transform((value) => value || null)
const imagePath = z
  .string()
  .regex(/^\/[a-zA-Z0-9._/-]+$/)
  .nullish()
  .transform((value) => value || null)
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .or(z.literal(''))
  .nullish()
  .transform((value) => value || null)
const id = z.number().int().positive()

export const tmdbMovieSearchSchema = z.object({
  id,
  title: z.string(),
  original_title: optionalText,
  overview: optionalText,
  release_date: date,
  poster_path: imagePath,
  backdrop_path: imagePath,
  original_language: optionalText,
  vote_average: z.number().min(0).max(10).nullish(),
  vote_count: z.number().int().nonnegative().nullish(),
  popularity: z.number().nullish(),
  genre_ids: z.array(id).default([]),
  adult: z.boolean().default(false),
})

export const tmdbPersonSearchSchema = z.object({
  id,
  name: z.string(),
  profile_path: imagePath,
  known_for_department: optionalText,
  known_for: z
    .array(
      z.object({ title: z.string().optional(), name: z.string().optional() }),
    )
    .default([]),
  adult: z.boolean().default(false),
})

export const tmdbMovieDetailsSchema = tmdbMovieSearchSchema
  .omit({ genre_ids: true })
  .extend({
    runtime: z.number().int().nonnegative().nullish(),
    genres: z.array(z.object({ id, name: z.string() })).default([]),
    production_countries: z
      .array(z.object({ iso_3166_1: z.string(), name: z.string() }))
      .default([]),
    spoken_languages: z
      .array(
        z.object({
          english_name: z.string().optional(),
          iso_639_1: z.string(),
          name: z.string(),
        }),
      )
      .default([]),
    tagline: optionalText,
    status: optionalText,
  })

const personCredit = z.object({
  id,
  name: z.string(),
  profile_path: imagePath,
  known_for_department: optionalText,
  credit_id: optionalText,
})

export const tmdbMovieCreditsSchema = z.object({
  id,
  cast: z
    .array(
      personCredit.extend({
        character: optionalText,
        order: z.number().int().nonnegative().nullish(),
      }),
    )
    .default([]),
  crew: z
    .array(personCredit.extend({ job: optionalText, department: optionalText }))
    .default([]),
})

export const tmdbPersonDetailsSchema = z.object({
  id,
  name: z.string(),
  profile_path: imagePath,
  known_for_department: optionalText,
  biography: optionalText,
  birthday: date,
  deathday: date,
  place_of_birth: optionalText,
})

export const tmdbPersonCreditsSchema = z.object({
  id,
  cast: z
    .array(
      tmdbMovieSearchSchema.extend({
        character: optionalText,
        credit_id: optionalText,
      }),
    )
    .default([]),
  crew: z
    .array(
      tmdbMovieSearchSchema.extend({
        job: optionalText,
        department: optionalText,
        credit_id: optionalText,
      }),
    )
    .default([]),
})

export const tmdbProviderSchema = z.object({
  provider_id: id,
  provider_name: z.string(),
  logo_path: imagePath,
  display_priority: z.number().int().default(1000),
})

const providers = z.array(tmdbProviderSchema).default([])
export const tmdbRegionProvidersSchema = z.object({
  link: z
    .string()
    .url()
    .refine((value) => {
      const url = new URL(value)
      return url.protocol === 'https:' && url.hostname === 'www.themoviedb.org'
    })
    .nullish(),
  flatrate: providers,
  free: providers,
  ads: providers,
  rent: providers,
  buy: providers,
})

export const tmdbWatchProvidersSchema = z.object({
  id,
  results: z.record(z.string(), tmdbRegionProvidersSchema),
})

export const tmdbSearchResponseSchema = z.object({
  page: z.number().int().positive(),
  total_pages: z.number().int().nonnegative(),
  total_results: z.number().int().nonnegative(),
  results: z.array(z.unknown()),
})

export type TmdbMovieDetails = z.infer<typeof tmdbMovieDetailsSchema>
export type TmdbMovieCredits = z.infer<typeof tmdbMovieCreditsSchema>
export type TmdbPersonDetails = z.infer<typeof tmdbPersonDetailsSchema>
export type TmdbPersonCredits = z.infer<typeof tmdbPersonCreditsSchema>
export type TmdbMovieSearch = z.infer<typeof tmdbMovieSearchSchema>
export type TmdbPersonSearch = z.infer<typeof tmdbPersonSearchSchema>
export type TmdbProviders = z.infer<typeof tmdbWatchProvidersSchema>
