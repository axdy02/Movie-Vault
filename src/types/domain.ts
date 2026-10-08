export type Genre = { id: number; name: string }
export type Credit = {
  tmdbId: number
  name: string
  profilePath: string | null
  type: 'cast' | 'crew'
  character: string | null
  job: string | null
  department: string | null
  order: number | null
}
export type MovieData = {
  tmdbId: number
  title: string
  originalTitle: string | null
  overview: string | null
  releaseDate: string | null
  year: number | null
  runtime: number | null
  language: string | null
  posterPath: string | null
  backdropPath: string | null
  tmdbRating: number | null
  voteCount: number | null
  popularity: number
  genres: Genre[]
  credits: Credit[]
  countries: string[]
}
export type PublicUserState = {
  userId: string
  displayName: string
  watched: boolean
  rating: number | null
  lastWatchedAt: string | null
  watchCount: number
}
export type ProviderOffer = {
  id: number
  name: string
  logoPath: string | null
  priority: number
}
export type OfferType = 'flatrate' | 'free' | 'ads' | 'rent' | 'buy'
export type ProviderData = {
  region: string
  offers: Record<OfferType, ProviderOffer[]>
  link: string | null
  fetchedAt: string | null
  error?: string
}
export type LibraryMovie = MovieData & {
  id: string
  saved: boolean
  addedAt: string
  addedBy: string
  addedById: string
  states: PublicUserState[]
  collectionIds: string[]
  providers: ProviderData | null
}
export type PersonData = {
  tmdbId: number
  name: string
  profilePath: string | null
  department: string | null
  biography: string | null
  knownFor: string[]
}
export type LibraryPerson = PersonData & {
  id: string
  movieIds: string[]
  directedMovieIds: string[]
}
export type FilmographyMovie = MovieData & {
  role: string
  creditType: 'cast' | 'crew'
}
export type CollectionData = {
  id: string
  name: string
  slug: string
  description: string | null
  coverMovieId: string | null
  pinned: boolean
  movieIds: string[]
  createdAt: string
}
export type ActivityEvent = {
  id: string
  actorName: string
  actorId: string | null
  action: string
  entityType: string
  movieId: string | null
  movieTitle: string | null
  collectionId: string | null
  collectionName: string | null
  sourceSurface: string | null
  sourceRoute: string | null
  interactionMethod: string | null
  createdAt: string
  before?: Record<string, unknown> | null
  after?: Record<string, unknown> | null
}
export type EditorProfile = {
  id: string
  displayName: string
  avatarUrl: string | null
}
export type VaultData = {
  configured: boolean
  movies: LibraryMovie[]
  people: LibraryPerson[]
  collections: CollectionData[]
  events: ActivityEvent[]
  editors: EditorProfile[]
  error?: string
}
export type SearchData = {
  movies: MovieData[]
  people: PersonData[]
  page: number
  totalPages: number
}
export type ActionResult =
  | { ok: true; message: string; id?: string; redirectTo?: string }
  | { ok: false; message: string; code?: string }
export type MutationContext = {
  surface:
    | 'global_search'
    | 'movie_detail'
    | 'person_filmography'
    | 'collection_editor'
    | 'library_grid'
    | 'random_picker'
    | 'settings'
    | 'other'
  route: string
  method: 'button' | 'keyboard' | 'bulk_action' | 'server_refresh'
  query?: string
  personTmdbId?: number
}
