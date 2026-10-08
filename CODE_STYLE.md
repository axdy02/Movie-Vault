# CODE STYLE — Movie Vault

## 1. Language Rules

- TypeScript only for application code.
- `strict: true`.
- No `any` unless isolated and justified with comment.
- Prefer `unknown` + validation.
- External API payloads must be validated before use.

---

## 2. Naming

### Files

- components: `movie-card.tsx`
- hooks: `use-library-filters.ts`
- server actions: `library.actions.ts`
- queries: `library.queries.ts`
- schemas: `movie.schema.ts`

### Types

- `MovieCardData`
- `LibraryMovie`
- `TmdbMovieSearchResult`
- `AuditEvent`

Do not prefix interfaces with `I`.

---

## 3. Component Rules

- Prefer Server Components by default.
- Add `'use client'` only where interaction requires it.
- Keep client boundaries small.
- Page files orchestrate; feature components render.
- Do not put database queries directly inside reusable presentational components.

---

## 4. Function Size

As a guideline:

- keep functions focused
- if a function mixes validation, auth, remote fetch, DB mutation, and formatting, split it

Do not split purely to satisfy arbitrary line counts.

---

## 5. Data Access

All Supabase reads/writes go through named query/mutation modules.

Bad:

```ts
// random component
supabase.from('movies').select('*')
```

Preferred:

```ts
const movies = await getLibraryMovies(filters)
```

---

## 6. Error Handling

Use typed application errors where useful:

- `UnauthorizedError`
- `ForbiddenError`
- `ValidationError`
- `ExternalServiceError`

User-facing messages should be safe and concise.

Technical details go to server logs.

---

## 7. Validation

Zod schemas should live near domain boundaries.

Validate:

- env vars
- URL params
- form inputs
- TMDB payloads
- mutation payloads

Avoid duplicating the same rule manually across components.

---

## 8. Formatting

Use Prettier defaults with project config.

Recommended:

- single quotes
- no semicolons if consistent with project
- trailing commas where supported

Consistency matters more than a specific preference.

---

## 9. Import Order

1. framework / third-party
2. absolute project imports
3. relative imports
4. styles

Use alias:

```text
@/* -> src/*
```

---

## 10. Database Types

Generate Supabase database types and commit the generated type file if reproducible in CI/dev workflow.

Do not hand-maintain duplicate database row types when generated types are available.

---

## 11. Comments

Comments should explain **why**, not narrate obvious code.

Good:

```ts
// Provider data is regional and stale-tolerant; keep the last snapshot
// if TMDB refresh fails so the detail page does not regress to empty UI.
```

Bad:

```ts
// increment i
```

---

## 12. UI State

Database state should not be copied into global client stores.

Use:

- server data
- URL search params
- component state
- form state

Only use Zustand for true ephemeral cross-component state.

---

## 13. Constants

Centralize:

- default region `IN`
- provider cache TTL
- search debounce
- image sizes
- rating min/max

Avoid magic numbers in components.

---

## 14. Accessibility in Code Review

Every interactive PR must check:

- keyboard access
- labels
- focus behavior
- semantic elements
- disabled/loading state

---

## 15. Git Practices

Branch examples:

```text
feat/movie-search
feat/audit-log
fix/provider-cache
chore/supabase-types
```

Commit messages:

```text
feat: add person filmography search
fix: prevent duplicate collection membership
security: enforce editor-only watch mutations
```
