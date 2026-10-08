# ARCHITECTURE — Movie Vault

## 1. System Overview

```text
┌──────────────────────────────────────────────────────────────┐
│                         Browser                              │
│  Public visitor OR one of two authenticated editors         │
└───────────────┬──────────────────────────┬───────────────────┘
                │                          │
                │ Next.js pages/actions   │ Supabase public client
                ▼                          ▼
┌──────────────────────────────┐   ┌────────────────────────────┐
│        Vercel / Next.js      │   │      Supabase Platform     │
│                              │   │                            │
│ App Router                   │   │ Auth                       │
│ Server Components            │   │ Postgres                   │
│ Route Handlers               │   │ RLS                        │
│ Server Actions               │   │ SQL functions/triggers     │
│ TMDB secret proxy            │   │ Audit/event storage        │
└──────────────┬───────────────┘   └────────────────────────────┘
               │
               │ server-side Bearer token
               ▼
      ┌─────────────────────┐
      │       TMDB API      │
      │ search/details      │
      │ people/credits      │
      │ watch providers     │
      │ image metadata      │
      └─────────────────────┘
```

---

## 2. Architectural Principles

1. **Public read, private write.**
2. **Serverless by default.**
3. **No duplicate movie records.**
4. **External data is cached; user state is canonical locally.**
5. **Authorization lives in RLS, not just UI.**
6. **Audit history is append-only.**
7. **Movie/person IDs are anchored to TMDB IDs.**
8. **The UI derives categories from relations instead of storing category copies.**

---

## 3. Data Ownership

### TMDB owns authoritative external metadata

Examples:

- movie title
- posters/backdrops
- cast/crew
- release date
- runtime
- genres
- provider availability

### Movie Vault owns user/application data

Examples:

- whether a movie is saved
- who added it
- collections
- watched state
- watch events
- ratings
- notes
- audit history

If TMDB metadata changes, user data must remain intact.

---

## 4. Read Paths

### Public library read

```text
Browser
  → Next.js Server Component
  → Supabase SELECT under anon/public policy
  → Render public library
```

### Authenticated library read

```text
Browser
  → Next.js with Supabase session cookie
  → SELECT under authenticated RLS policy
  → Include private user state
```

### Global movie search

```text
Browser
  → /api/tmdb/search?q=...
  → Vercel route handler
  → TMDB
  → validate/transform
  → Browser
```

### Movie provider read

```text
Movie page
  → read provider cache from Supabase
  → if fresh: render
  → if stale/missing: server refresh from TMDB
  → upsert cache using protected server path
  → render result
```

---

## 5. Write Paths

### Add movie

```text
Editor clicks Add
  → server action
  → verify authenticated editor
  → fetch TMDB details + credits
  → DB transaction/function
      - upsert movie
      - upsert people
      - upsert movie_people
      - create/restore library_item
      - append audit_event
  → revalidate library/person/movie routes
```

### Mark watched

```text
Editor clicks Watched
  → server action
  → verify editor
  → DB transaction
      - update user_movie_state
      - insert watch_event
      - append audit_event
  → optimistic UI settles against server result
```

### Add to collection

```text
Editor chooses collection
  → server action
  → insert collection_item if absent
  → append audit_event
```

---

## 6. Recommended Application Folder Structure

```text
src/
  app/
    (public)/
      page.tsx
      library/page.tsx
      movie/[slug]/page.tsx
      people/[slug]/page.tsx
      collections/page.tsx
      collections/[slug]/page.tsx
      activity/page.tsx
      about/page.tsx
    (auth)/
      login/page.tsx
    (member)/
      settings/page.tsx
    api/
      tmdb/
        search/route.ts
        movie/[id]/route.ts
        person/[id]/route.ts
        person/[id]/credits/route.ts
        movie/[id]/providers/route.ts
      provider-cache/refresh/route.ts
  components/
    movie/
    people/
    collections/
    activity/
    search/
    filters/
    layout/
    ui/
  features/
    library/
    watch-history/
    ratings/
    collections/
    audit/
    providers/
  lib/
    supabase/
      browser.ts
      server.ts
      middleware.ts
    tmdb/
      client.ts
      schemas.ts
      transforms.ts
      image.ts
    auth/
      require-editor.ts
    validation/
    utils/
  server/
    actions/
    queries/
    mutations/
  types/
  styles/
```

---

## 7. Separation of Concerns

### `lib/tmdb`

Only knows TMDB external API shapes and transforms.

### `server/queries`

Read application database.

### `server/mutations`

Write application database.

### `features/*`

Feature-oriented UI and orchestration.

### `components/ui`

Generic primitives only. No movie-specific business rules.

---

## 8. Data Sync Philosophy

Do not attempt to mirror all of TMDB.

Persist metadata only for movies/people relevant to the shared library.

For people:

- persist people involved with saved movies
- cache additional filmography temporarily rather than permanently importing every credit

For movie credits:

- persist director(s)
- persist useful top-billed cast, e.g. top 10–20
- fetch full credits on demand

This keeps database size and complexity small.

---

## 9. Soft Delete Strategy

Entities with historical meaning should use soft deletion.

### Library item

- `removed_at`
- `removed_by`

### Collection

- `archived_at`
- `archived_by`

Benefits:

- audit history remains resolvable
- re-add can restore the same movie relation
- analytics are accurate

Movie metadata rows themselves generally should not be deleted merely because a library item is removed.

---

## 10. Audit Architecture

Audit history should be created as close to the database write as possible.

Preferred patterns:

1. SQL functions that perform mutation + audit insert atomically.
2. Database triggers for simple direct table mutations.

Avoid relying exclusively on frontend “also write an audit row” calls because a failed second call could create gaps.

### Audit actor

Use `auth.uid()` inside database functions/policies where possible.

### Audit display-name snapshot

Store a small snapshot of display name at event time so historical feed remains understandable if profile name changes later.

---

## 11. Public vs Private Views

Recommended database views:

- `public_library_movies`
- `public_collections`
- `public_collection_items`
- optional `public_activity_feed`

Private details such as notes or internal audit metadata should never be included in public views.

---

## 12. Revalidation Strategy

After mutations, revalidate relevant paths/tags:

- `library`
- `movie:{movieId}`
- `person:{personId}`
- `collection:{collectionId}`
- `activity`

Do not globally purge every page after every action.

---

## 13. Failure Modes

### TMDB unavailable

- Saved library still renders from Supabase.
- Add/search remote actions show non-destructive retry error.

### Supabase unavailable

- Public cached/static shell can render.
- Data sections show error boundary with retry.

### Provider data unavailable

- Show unknown/unlisted, not “not available anywhere.”

### Auth expired

- Mutation returns auth-required error.
- Prompt login without losing current route.

---

## 14. Scale Assumptions

Designed for:

- 2 editors
- tens to a few thousand saved movies
- public portfolio traffic

No architecture should be added solely to support millions of users at V1.

If public adoption ever grows, revisit:

- rate limiting
- separate backend
- search engine
- background jobs
- provider refresh jobs
- additional user roles
