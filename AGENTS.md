# AGENTS.md — Instructions for Coding Agents

## 1. Mission

Build and maintain Movie Vault exactly according to the repository specifications. Treat `PRD.md`, `TRD.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN_SYSTEM.md`, `CODE_STYLE.md`, and `TESTING.md` as source-of-truth documents.

Do not simplify away requirements merely because a faster CRUD implementation is possible.

---

## 2. Non-Negotiable Product Rules

1. Public users can browse but cannot mutate.
2. Only the two approved editor accounts can change data.
3. No public signup.
4. A movie is stored once and reused across actor/director/genre/collection views.
5. Watched state is per user.
6. Watch history is separate from current watched state.
7. Audit logs are append-only and must exist for all important mutations.
8. TMDB token remains server-side.
9. Supabase service-role key remains server-side.
10. RLS is mandatory and must be tested.
11. Watch-provider data is regional; default region is India (`IN`).
12. The site remains usable as a public portfolio demo.
13. Do not introduce paid infrastructure unless explicitly approved.

---

## 3. Approved Stack

Use:

- Next.js 16 App Router
- React 19
- TypeScript strict
- Tailwind CSS 4
- shadcn/ui
- Motion
- Lucide
- Supabase Auth/Postgres/RLS
- Zod
- React Hook Form when needed
- Vitest + React Testing Library
- Playwright
- Vercel
- TMDB API

Do not add by default:

- Express
- FastAPI
- Prisma
- MongoDB
- Firebase
- Redux
- Docker production stack
- Redis
- paid search services

Any deviation requires a concrete reason.

---

## 4. Before Coding a Feature

1. Read the relevant spec files.
2. Identify affected database tables.
3. Identify public vs editor behavior.
4. Identify audit event requirements.
5. Identify tests required.
6. Check whether TMDB data must be cached or transformed.
7. Implement the smallest complete vertical slice.

---

## 5. Database Change Rules

- Every schema change must be a migration.
- Never manually patch production only.
- Add RLS policies with the migration.
- Add indexes needed by the feature.
- Update generated Supabase types.
- Add or update RLS/integration tests.

---

## 6. Mutation Rules

For every mutation, answer:

- Who is allowed to do this?
- What validation is required?
- What current row(s) change?
- Is history required?
- What audit event is written?
- What routes/tags need revalidation?

Do not ship a mutation with no authorization or audit path.

---

## 7. Audit Event Naming

Use stable snake_case action names.

Examples:

```text
movie.added
movie.removed
movie.restored
movie.metadata_refreshed
watch.marked
watch.unmarked
watch.event_recorded
watch.event_corrected
rating.set
rating.changed
rating.removed
collection.created
collection.renamed
collection.updated
collection.archived
collection.movie_added
collection.movie_removed
note.created
note.updated
note.deleted
provider.refreshed
```

Do not invent new action names if an existing one fits.

---

## 8. UI Rules

- Follow `DESIGN_SYSTEM.md`.
- Dark cinematic visual language.
- Poster-first.
- No generic SaaS dashboard aesthetic.
- Do not overcrowd cards with metadata.
- Public users should not see dozens of disabled edit buttons.
- Mobile layout is required, not optional.
- Respect reduced motion.

---

## 9. Search Rules

- Local saved results first.
- Remote TMDB search debounced.
- Search movies and people.
- Deduplicate by TMDB IDs.
- Year shown for movies.
- Person context shown for people.

---

## 10. TMDB Rules

- Never expose bearer token.
- Validate payloads.
- Gracefully handle missing images/runtime/cast/provider data.
- Do not claim provider availability is exhaustive if TMDB returns no result.
- Preserve TMDB/JustWatch attribution requirements.

---

## 11. Security Rules

Before declaring a protected feature complete:

- verify anonymous request is denied
- verify authorized editor succeeds
- verify secrets are server-only
- verify user input is validated
- verify audit row exists

---

## 12. Testing Rules

Every feature PR should include tests proportional to risk.

Mandatory tests for:

- auth/authorization
- RLS
- audit logging
- add/remove movie
- watched state/history
- rating
- collection membership
- provider normalization
- search transforms

Do not mock away authorization in security tests.

---

## 13. Refactoring Rules

Do not rewrite working architecture for preference alone.

Refactor when it improves:

- correctness
- maintainability
- performance
- testability
- accessibility

Avoid “big bang” refactors during unrelated feature work.

---

## 14. Error Handling

Every async mutation must have:

- pending state
- success state
- recoverable error state

Never silently fail.

Do not leak raw Supabase/TMDB errors to public UI.

---

## 15. Completion Checklist for an Agent

Before saying a task is complete:

- [ ] feature matches PRD behavior
- [ ] types pass
- [ ] lint passes
- [ ] relevant tests pass
- [ ] RLS considered/tested
- [ ] audit event implemented
- [ ] mobile state checked
- [ ] loading/empty/error states handled
- [ ] no secret exposed
- [ ] no unnecessary dependency added
- [ ] docs updated if behavior/schema changed
