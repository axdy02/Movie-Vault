import { PROVIDER_TTL_MS, PROVIDER_STALE_LIMIT_MS } from '@/lib/constants'
import type {
  Credit,
  FilmographyMovie,
  MovieData,
  OfferType,
  PersonData,
  ProviderData,
  SearchData,
} from '@/types/domain'
import {
  tmdbMovieSearchSchema,
  tmdbPersonSearchSchema,
  type TmdbMovieCredits,
  type TmdbMovieDetails,
  type TmdbMovieSearch,
  type TmdbPersonCredits,
  type TmdbPersonDetails,
  type TmdbPersonSearch,
  type TmdbProviders,
} from './schemas'

const offerTypes: OfferType[] = ['flatrate', 'free', 'ads', 'rent', 'buy']

export function transformMovieSearch(movie: TmdbMovieSearch): MovieData {
  return {
    tmdbId: movie.id,
    title: movie.title,
    originalTitle: movie.original_title,
    overview: movie.overview,
    releaseDate: movie.release_date,
    year: movie.release_date ? Number(movie.release_date.slice(0, 4)) : null,
    runtime: null,
    language: movie.original_language,
    posterPath: movie.poster_path,
    backdropPath: movie.backdrop_path,
    tmdbRating: movie.vote_average ?? null,
    voteCount: movie.vote_count ?? null,
    popularity: movie.popularity ?? 0,
    genres: [],
    credits: [],
    countries: [],
  }
}

export function transformCredits(credits: TmdbMovieCredits): Credit[] {
  return [
    ...credits.cast.map((person): Credit => ({
      tmdbId: person.id,
      name: person.name,
      profilePath: person.profile_path,
      type: 'cast',
      character: person.character,
      job: null,
      department: person.known_for_department ?? 'Acting',
      order: person.order ?? null,
    })),
    ...credits.crew.map((person): Credit => ({
      tmdbId: person.id,
      name: person.name,
      profilePath: person.profile_path,
      type: 'crew',
      character: null,
      job: person.job,
      department: person.department,
      order: null,
    })),
  ]
}

export function transformMovie(
  movie: TmdbMovieDetails,
  credits?: TmdbMovieCredits,
): MovieData {
  return {
    ...transformMovieSearch({
      ...movie,
      genre_ids: movie.genres.map((genre) => genre.id),
    }),
    runtime: movie.runtime || null,
    genres: movie.genres,
    credits: credits ? transformCredits(credits) : [],
    countries: movie.production_countries.map((country) => country.name),
  }
}

export function transformPersonSearch(person: TmdbPersonSearch): PersonData {
  return {
    tmdbId: person.id,
    name: person.name,
    profilePath: person.profile_path,
    department: person.known_for_department,
    biography: null,
    knownFor: person.known_for
      .map((credit) => credit.title || credit.name || '')
      .filter(Boolean)
      .slice(0, 3),
  }
}

export function transformPerson(person: TmdbPersonDetails): PersonData {
  return {
    tmdbId: person.id,
    name: person.name,
    profilePath: person.profile_path,
    department: person.known_for_department,
    biography: person.biography,
    knownFor: [],
  }
}

export function transformSearch(
  results: unknown[],
  type: 'multi' | 'movie' | 'person' = 'multi',
): Pick<SearchData, 'movies' | 'people'> {
  const movies = new Map<number, MovieData>()
  const people = new Map<number, PersonData>()
  for (const result of results) {
    if (
      typeof result === 'object' &&
      result !== null &&
      'media_type' in result &&
      result.media_type !== 'movie' &&
      result.media_type !== 'person'
    )
      continue
    const movie =
      type !== 'person' ? tmdbMovieSearchSchema.safeParse(result) : null
    if (movie?.success && !movie.data.adult) {
      movies.set(movie.data.id, transformMovieSearch(movie.data))
      continue
    }
    const person =
      type !== 'movie' ? tmdbPersonSearchSchema.safeParse(result) : null
    if (person?.success && !person.data.adult)
      people.set(person.data.id, transformPersonSearch(person.data))
  }
  return { movies: [...movies.values()], people: [...people.values()] }
}

export function transformFilmography(
  credits: TmdbPersonCredits,
): FilmographyMovie[] {
  const movies = new Map<string, FilmographyMovie>()
  for (const credit of credits.cast) {
    if (credit.adult) continue
    const key = `cast:${credit.id}`
    const existing = movies.get(key)
    const role = credit.character || 'Cast'
    movies.set(key, {
      ...transformMovieSearch(credit),
      creditType: 'cast',
      role: existing
        ? existing.role.split(', ').includes(role)
          ? existing.role
          : `${existing.role}, ${role}`
        : role,
    })
  }
  for (const credit of credits.crew) {
    if (credit.adult) continue
    const key = `crew:${credit.id}`
    const existing = movies.get(key)
    const role = credit.job || credit.department || 'Crew'
    movies.set(key, {
      ...transformMovieSearch(credit),
      creditType: 'crew',
      role: existing
        ? existing.role.split(', ').includes(role)
          ? existing.role
          : `${existing.role}, ${role}`
        : role,
    })
  }
  return [...movies.values()].sort((a, b) => b.popularity - a.popularity)
}

export function normalizeProviders(
  payload: TmdbProviders,
  region = 'IN',
  fetchedAt = new Date().toISOString(),
): ProviderData {
  const regional = payload.results[region]
  const offers = Object.fromEntries(
    offerTypes.map((type) => {
      const unique = new Map(
        (regional?.[type] ?? []).map((provider) => [
          provider.provider_id,
          {
            id: provider.provider_id,
            name: provider.provider_name,
            logoPath: provider.logo_path,
            priority: provider.display_priority,
          },
        ]),
      )
      return [
        type,
        [...unique.values()].sort((a, b) => a.priority - b.priority),
      ]
    }),
  ) as ProviderData['offers']
  return { region, offers, link: regional?.link ?? null, fetchedAt }
}

export function providerFreshness(
  fetchedAt: string | null,
  now = Date.now(),
): 'missing' | 'fresh' | 'stale' | 'expired' {
  if (!fetchedAt || !Number.isFinite(Date.parse(fetchedAt))) return 'missing'
  const age = Math.max(0, now - Date.parse(fetchedAt))
  return age < PROVIDER_TTL_MS
    ? 'fresh'
    : age < PROVIDER_STALE_LIMIT_MS
      ? 'stale'
      : 'expired'
}

export function moviePersistencePayload(
  movie: TmdbMovieDetails,
  credits: TmdbMovieCredits,
) {
  return {
    tmdb_id: movie.id,
    title: movie.title,
    original_title: movie.original_title,
    overview: movie.overview,
    release_date: movie.release_date,
    release_year: movie.release_date
      ? Number(movie.release_date.slice(0, 4))
      : null,
    runtime_minutes: movie.runtime || null,
    original_language: movie.original_language,
    poster_path: movie.poster_path,
    backdrop_path: movie.backdrop_path,
    tmdb_vote_average: movie.vote_average ?? null,
    tmdb_vote_count: movie.vote_count ?? null,
    tmdb_popularity: movie.popularity ?? 0,
    metadata_json: {
      countries: movie.production_countries.map((country) => country.name),
      spoken_languages: movie.spoken_languages,
      tagline: movie.tagline,
    },
    genres: movie.genres,
    credits: [
      ...credits.cast
        .filter((person) => (person.order ?? 999) < 20)
        .map((person) => ({
          tmdb_person_id: person.id,
          name: person.name,
          profile_path: person.profile_path,
          known_for_department: person.known_for_department,
          credit_type: 'cast',
          character_name: person.character,
          department: person.known_for_department ?? 'Acting',
          job: null,
          cast_order: person.order,
          credit_id: person.credit_id,
        })),
      ...credits.crew
        .filter((person) => person.job === 'Director')
        .map((person) => ({
          tmdb_person_id: person.id,
          name: person.name,
          profile_path: person.profile_path,
          known_for_department: person.known_for_department,
          credit_type: 'crew',
          character_name: null,
          department: person.department,
          job: person.job,
          cast_order: null,
          credit_id: person.credit_id,
        })),
    ],
  }
}
