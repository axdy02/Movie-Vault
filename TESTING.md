# TESTING — Movie Vault

## 1. Testing Strategy

Use a testing pyramid appropriate for a small production web app:

1. unit tests for pure logic
2. integration tests for data transformations and mutations
3. E2E tests for critical user journeys
4. RLS/security tests for access control

---

## 2. Unit Tests — Vitest

Required pure logic tests:

- TMDB movie transform.
- TMDB person transform.
- Provider normalization.
- Provider freshness calculation.
- Rating average calculation.
- Watched aggregate state (`both`, `userA`, `userB`, `neither`).
- URL filter serialization/parsing.
- Random picker candidate filtering.
- Slug generation.
- Audit event human-readable formatter.

---

## 3. Component Tests — React Testing Library

Priority components:

- MovieCard.
- WatchedStatus.
- RatingControl.
- SearchCombobox.
- FilterBar.
- CollectionDialog.
- ProviderList.
- ActivityRow.

Test behavior, not implementation internals.

---

## 4. API/Transformation Tests

Use fixture JSON for TMDB payloads.

Cases:

- movie missing poster
- person missing profile image
- no provider result for India
- multiple provider categories
- original title differs from display title
- movie with missing runtime

---

## 5. Database Integration Tests

Against local/test Supabase where practical.

Required:

### Movie add

- creates movie if missing
- reuses existing movie by tmdb_id
- restores removed library item
- creates audit event

### Watch

- updates current state
- inserts watch event
- creates audit event
- second watch can create rewatch history

### Collection

- prevents active duplicate membership
- soft-removal works
- re-add restores/creates correct history

### Rating

- rejects invalid values
- supports half steps
- audit before/after is correct

---

## 6. RLS Tests

Absolutely required.

### Anonymous

- can read public library view
- cannot insert library item
- cannot update user_movie_state
- cannot insert collection
- cannot delete collection
- cannot modify audit events

### Authorized editor

- can add movie
- can mark watched
- can rate
- can create collection

### Unauthorized authenticated user

If a non-profile auth user can be created in test environment:

- mutation denied

---

## 7. Playwright E2E — Critical Journeys

### Public browse

1. Open `/` logged out.
2. Browse library.
3. Open movie detail.
4. Confirm edit actions unavailable.

### Editor login

1. Open `/login`.
2. Authenticate test editor.
3. Redirect to library.
4. Editor controls visible.

### Search + add

1. Search unique movie.
2. Open result or click Add.
3. Verify movie appears saved.
4. Verify activity feed entry.

### Watched flow

1. Open saved movie.
2. Mark watched.
3. Verify status.
4. Verify watch event in history.
5. Verify activity feed.

### Collection flow

1. Create collection.
2. Add movie.
3. Open collection.
4. Verify membership.
5. Remove movie.
6. Verify audit entries.

### Provider flow

1. Open movie with fixture provider data.
2. Confirm `IN` providers render.
3. Change region.
4. Confirm provider list changes.

---

## 8. Search Tests

- 1-char query stays local.
- 2+ chars remote search can fire.
- debounce prevents request per keystroke.
- stale request does not overwrite newer query results.
- duplicate movie results are deduplicated by TMDB ID.
- person results are distinguishable from movies.

---

## 9. Audit Log Tests

Every required mutation must assert an audit row.

Test fields:

- actor
- action
- entity_type
- entity_id
- source_surface
- source_route
- before_state where applicable
- after_state where applicable
- created_at

Ensure note body/password/token never appears in metadata.

---

## 10. Accessibility Tests

At minimum:

- keyboard navigate search dropdown
- dialog focus trap
- visible focus
- button accessible names
- poster alt text
- color contrast manual check

Optional automated axe checks can be added to Playwright.

---

## 11. Performance Checks

Before V1 release:

- Lighthouse on home, library, movie detail.
- verify poster images use optimized sizing.
- verify no hundreds of database queries for a single grid.
- verify no full credits fetch per movie card.

---

## 12. Regression Checklist Before Production

- login works
- logout works
- public browse works
- anonymous mutation blocked
- search works
- add/remove works
- watched state works for both users independently
- rewatch history works
- rating works
- collections work
- provider availability works
- activity feed works
- mobile navigation works
- missing images do not break layout
- 404 page works
- environment secrets not present in client output
