# TRD — Technical Requirements Document

## 1. Technical Objective

Build Movie Vault as a low-maintenance, public-read/private-write web application with no traditional self-managed backend. Use Next.js server capabilities only where secrets or privileged writes are required.

---

## 2. Required Technology Stack

### Application

- **Next.js 16.x** — App Router
- **React 19.x**
- **TypeScript** — strict mode
- **Node.js 22+ runtime** on Vercel
- **Tailwind CSS 4.x**
- **shadcn/ui** for accessible primitives where appropriate
- **Motion** (`motion/react`) for restrained transitions
- **Lucide React** for icons

### Forms / validation / client state

- **Zod** for validation of API payloads, route params, env, and form data
- **React Hook Form** for forms that need more than trivial local state
- Prefer React Server Components and URL state before adding global state
- **Zustand** only for small ephemeral cross-component UI state if needed; never as database state

### Data/auth

- **Supabase Postgres**
- **Supabase Auth**
- **Supabase Row Level Security**
- **@supabase/ssr** and **@supabase/supabase-js**
- SQL migrations kept in repository

### Movie data

- **TMDB API**
- Movie search
- Multi/person search where useful
- Movie details
- Movie credits
- Person details
- Person movie credits
- Watch providers
- TMDB image CDN

### Hosting

- **Vercel**
- GitHub source repository
- Preview deployments for pull requests

### Testing

- **Vitest**
- **React Testing Library**
- **Playwright**
- Optional **MSW** for external API mocking

### Quality

- ESLint
- Prettier
- TypeScript compiler checks
- Husky/lint-staged optional, not mandatory

---

## 3. Architecture Constraints

1. No Express server.
2. No FastAPI service.
3. No EC2/VPS.
4. No Docker required for production.
5. No Prisma required; Supabase/Postgres schema is managed with SQL migrations.
6. TMDB secret/token must remain server-side.
7. Supabase anon key may be used client-side; service-role key must never be exposed.
8. Client-side mutations must still be RLS protected.
9. Audit log cannot depend solely on frontend code; sensitive mutations should create audit entries transactionally or via database trigger/function.
10. Avoid polling. Use revalidation or explicit refetch after mutation.

---

## 4. Rendering Strategy

### Server-render where useful

- Public home page.
- Library page initial result.
- Movie detail initial content when saved/cached.
- Collection pages.
- SEO-relevant public pages.

### Client components for

- Search typeahead.
- Filters.
- Dialogs.
- Rating controls.
- Watched toggle.
- Random picker.
- Optimistic mutation feedback.

### Dynamic data rules

- Supabase-backed public pages may use server fetch + revalidation.
- Auth-sensitive pages should use request-time session checks.
- TMDB search is always dynamic and proxied via server route.

---

## 5. Environment Variables

Server-only:

```text
TMDB_READ_ACCESS_TOKEN=
SUPABASE_SERVICE_ROLE_KEY=
```

Public-safe:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=
```

Optional:

```text
NEXT_PUBLIC_DEFAULT_REGION=IN
```

Validation must run at startup/build using Zod.

---

## 6. External API Endpoints to Use

TMDB examples:

```text
GET /3/search/movie
GET /3/search/person
GET /3/search/multi
GET /3/movie/{movie_id}
GET /3/movie/{movie_id}/credits
GET /3/movie/{movie_id}/watch/providers
GET /3/person/{person_id}
GET /3/person/{person_id}/movie_credits
GET /3/genre/movie/list
```

The app must wrap these in internal server routes rather than exposing the TMDB bearer token.

Recommended internal routes:

```text
GET /api/tmdb/search?q=&type=
GET /api/tmdb/movie/:id
GET /api/tmdb/person/:id
GET /api/tmdb/person/:id/credits
GET /api/tmdb/movie/:id/providers?region=IN
POST /api/provider-cache/refresh
```

---

## 7. API Response Validation

Never trust TMDB response shapes implicitly.

Define Zod schemas for:

- MovieSearchResult
- PersonSearchResult
- MovieDetails
- MovieCredits
- PersonDetails
- PersonMovieCredits
- WatchProviders

Transform external API shapes into internal domain DTOs before rendering.

---

## 8. Caching Strategy

### Movie metadata

Persist saved movie metadata in Supabase so the library does not depend on TMDB for every render.

### TMDB search

Short server cache (e.g. 5–15 min) is acceptable.

### Person filmography

Can use Next.js fetch caching/revalidation around 6–24 h.

### Watch providers

Persist per movie + region in `movie_provider_snapshots`.

- Fresh: <24 h.
- Stale but usable: 24 h–7 days.
- Older: refresh on access.

No background cron is required for V1.

---

## 9. Mutation Strategy

Preferred approach:

- Use server actions or route handlers for multi-step mutations.
- Validate authenticated session.
- Perform database operation.
- Use database function/trigger to create audit event.
- Revalidate affected routes/tags.

Examples:

- `addMovieToLibrary()`
- `removeMovieFromLibrary()`
- `setWatchedState()`
- `recordWatchEvent()`
- `setRating()`
- `createCollection()`
- `addMovieToCollection()`

---

## 10. Database Transaction Requirements

These actions should be atomic:

### Add movie

- Upsert movie.
- Upsert people/credits.
- Restore/create library item.
- Write audit event.

### Mark watched

- Upsert user_movie_state.
- Insert watch event when applicable.
- Insert audit event.

### Add to collection

- Insert collection membership.
- Insert audit event.

If any required write fails, the action should fail rather than leave partial state.

---

## 11. Image Strategy

TMDB image URLs should be generated from configured sizes.

Use:

- `w342` or `w500` posters for cards.
- `w780` or `w1280` backdrops for detail hero.

Configure Next Image remote patterns for TMDB image CDN.

Fallback:

- Neutral poster placeholder.
- Never stretch missing images.

---

## 12. Search Implementation

Local saved-library search:

- Query Supabase across title, original title, people names, collection names.
- For small library size, server query with trigram/ILIKE is sufficient.

Global search:

- Debounced internal API call.
- Cache by normalized query.
- Return unified result DTO.

No Elasticsearch/Algolia required.

---

## 13. Provider Filtering

Because TMDB watch-provider data is regional and external, provider filtering must use cached normalized snapshots.

Recommended cache schema stores both:

- raw provider JSON
- normalized provider IDs/types for filtering

If a movie has no recent cache, provider-filter results may label it “availability unknown” rather than incorrectly excluding it as unavailable.

---

## 14. Logging / Observability

### Product audit logs

Stored in Postgres and visible in `/activity`.

### Technical logs

Use Vercel runtime logs for:

- TMDB request failures.
- Supabase mutation failures.
- Unexpected Zod validation failures.

Do not log secrets or auth tokens.

---

## 15. Performance Requirements

- Use pagination or incremental loading beyond ~50 cards.
- Avoid fetching full cast for every movie on a grid.
- Store only required top cast/director relationships for library grouping.
- Load full credits on detail/person pages.
- Avoid N+1 Supabase queries.
- Use select lists rather than `select('*')` in production code.

---

## 16. Browser Support

Target current stable:

- Chrome
- Edge
- Firefox
- Safari
- Android Chrome
- iOS Safari

No IE support.

---

## 17. Deployment Requirements

- Repository connected to Vercel.
- `main` deploys production.
- Pull requests create previews.
- Production env vars configured only in Vercel.
- Supabase production project separate from local/dev if possible.
- Database migrations applied before deploying code that depends on them.

---

## 18. Technical Definition of Done

- `npm run lint` passes.
- `npm run typecheck` passes.
- unit/integration tests pass.
- Playwright critical path passes.
- RLS tests demonstrate anonymous mutation denial.
- no TMDB token in built JS.
- no service-role key in client bundle.
- no public signup path.
- Vercel production build succeeds without warnings that hide real errors.
