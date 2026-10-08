# PRD — Collaborative Movie Vault

**Working title:** Movie Vault  
**Document type:** Product Requirements Document  
**Version:** 1.0  
**Status:** Build-ready baseline  
**Primary users:** Two trusted editors + public read-only visitors  
**Primary deployment:** Vercel  
**Primary data/API providers:** TMDB + Supabase  

---

## 1. Product Summary

Movie Vault is a public, portfolio-quality, collaborative movie discovery and watchlist application built around a simple real-world habit: maintaining a shared list of good movies grouped by actors. The product replaces a messy manually maintained actor → movie list with a visual, searchable, filterable, multi-user library.

The public site is fully browseable. Anyone can explore saved movies, actor/director views, collections, watch status summaries, ratings, and streaming availability. Only two pre-authorized users can authenticate and modify data.

The application must feel like a polished consumer product, not a CRUD demo. The intended experience is a lighter, personal blend of Letterboxd, Netflix, and Plex, focused on the users’ own curated library rather than on social networking or endless recommendations.

The core principle is **store a movie once, derive every view from structured metadata**. A title such as *Inception* is not duplicated under Leonardo DiCaprio, Tom Hardy, Cillian Murphy, Christopher Nolan, Sci-Fi, 2010s, etc. It exists once in the library and appears automatically in all applicable views.

---

## 2. Product Goals

### 2.1 Primary goals

1. Replace the original actor → movies text list with a visual shared movie library.
2. Make discovering and adding a movie take under 10 seconds from search to save.
3. Allow users to search globally by movie title, actor, cast member, director, or person.
4. Allow saved titles to be browsed by actor, director, genre, year/decade, collection, streaming provider, watched status, rating, runtime, and who added/watched them.
5. Keep infrastructure effectively free for personal use.
6. Make the project publicly accessible as a portfolio project without allowing public modification.
7. Keep a complete audit trail of all important changes.
8. Support two independent users with shared content and per-user watch/rating state.
9. Show official streaming availability by country using TMDB watch-provider data.
10. Avoid maintaining a traditional server, VM, Docker deployment, NGINX, or paid backend.

### 2.2 Secondary goals

- Provide a “What should we watch?” random picker constrained by active filters.
- Make actor pages feel like progress trackers: saved titles, watched titles, and unsaved filmography.
- Support custom collections such as “Mindfuck Movies,” “Bollywood Classics,” or “Movies to Watch Together.”
- Make every important state transition traceable: who, what, where, how, and when.
- Be technically strong enough to discuss in interviews: auth, RLS, relational modeling, API integration, server-side secrets, caching, audit logging, testing, and deployment.

### 2.3 Non-goals for V1

The initial release will **not** include:

- Public user registration.
- Social following/followers.
- User comments or public reviews.
- AI-generated recommendations.
- Full recommendation-engine personalization.
- Torrent/piracy links.
- Video hosting.
- Movie playback.
- Subscription billing.
- Native mobile apps.
- Complex admin CMS.
- Self-hosted backend infrastructure.

These can be added later only if the core product is stable.

---

## 3. User Types and Permissions

### 3.1 Public visitor

A public visitor can:

- Open the site without authentication.
- Browse the shared library.
- Search the saved library.
- Search TMDB globally.
- View movie details.
- View actor/director pages.
- View collections.
- View watched/unwatched aggregate states that are intentionally public.
- View ratings if public display is enabled.
- View activity feed items that are marked public-safe.
- View where a movie is officially available for the selected region.
- Use sort/filter controls.
- Use the random picker.

A public visitor cannot:

- Add or remove movies.
- Create, edit, or delete collections.
- Mark movies watched/unwatched.
- Add ratings or notes.
- Change application settings.
- Invite users.
- Access private editor-only activity metadata.

### 3.2 Editor — User A

One of the two trusted users. Can perform all allowed content mutations.

### 3.3 Editor — User B

Same permission set as User A unless a future “owner” role is introduced.

### 3.4 Optional future owner role

Not required for V1. If added later, the owner can manage editor invitations and application settings while editors manage content.

---

## 4. Authentication and Access Model

### 4.1 Login

- Use Supabase Auth.
- Email/password or magic-link login is supported.
- No public sign-up UI.
- Self-registration is disabled at the product level.
- Only the two approved accounts are provisioned/invited.
- `/login` is public but only existing users can authenticate.
- Successful login redirects to the previous route or `/library`.

### 4.2 Authorization

Authorization must not depend on hiding buttons.

- Supabase Row Level Security is mandatory.
- Public/anonymous users get SELECT access only to explicitly public tables/views.
- Authenticated approved editors get mutation access.
- Authorization checks are duplicated in server actions/API routes for better error handling, but RLS is the ultimate enforcement layer.
- The Supabase service-role key is never exposed to the browser.

### 4.3 Public demo behavior

The public site should show a subtle notice such as:

> Public demo — browsing is open; editing is restricted to members.

The notice must not obstruct normal browsing.

---

## 5. Core Domain Model

The application is based on the following concepts:

- **Movie:** canonical saved movie record mapped to a TMDB movie ID.
- **Person:** actor/director/crew member mapped to a TMDB person ID.
- **Library item:** a movie’s membership in the shared library, with add/remove lifecycle metadata.
- **User movie state:** per-user state such as watched, watchlist intent, rating, favorite, notes, and last watched date.
- **Watch event:** immutable historical record that a user watched a movie at a given time.
- **Collection:** user-defined grouping of movies.
- **Collection membership:** movie ↔ collection relationship.
- **Provider availability snapshot:** cached streaming/rent/buy availability per movie and region.
- **Audit event:** immutable append-only record of an action in the application.

---

## 6. Detailed Feature Requirements

## 6.1 Home / Dashboard

The home page must provide a high-signal overview rather than a generic landing page.

### Required sections

1. **Primary global search**
   - Placeholder: “Search movies, actors, directors…”
   - Searches local saved data immediately.
   - Can expand to global TMDB results.
   - Keyboard shortcut `/` focuses search.

2. **Continue Exploring**
   - Top actors/directors inferred from saved library.
   - Each tile displays person image, name, saved count, watched count, and progress.

3. **Watchlist / Unwatched**
   - Poster row of movies not watched by the current logged-in user.
   - For public visitors, use shared/aggregate unwatched state.

4. **Recently Added**
   - Ordered by library `added_at`.
   - Show “Added by X” for editor sessions.

5. **Recently Watched**
   - Driven by `watch_events.watched_at`, not by movie update timestamp.

6. **Collections**
   - Show pinned or recently used collections.

7. **Quick stats**
   - Total saved.
   - Watched by both.
   - Unwatched by both.
   - Watched by only one person.
   - Average user rating.

### Editor-only dashboard controls

- `+ Add movie`
- `+ New collection`
- “Activity” shortcut
- “Refresh provider data” for stale cache

---

## 6.2 Global Search

Search is a central feature and must support both local library discovery and global discovery.

### 6.2.1 Search modes

Search input should return grouped results:

- **Saved movies**
- **People**
- **Global movies**

The user should not have to explicitly choose “movie” vs “actor” before typing.

### 6.2.2 Query examples

- `Inception` → matching movie titles.
- `Jake Gyllenhaal` → person result + saved titles + filmography entry point.
- `Nolan` → Christopher Nolan + movies.
- `Batman` → all matching movie titles.
- `Aamir` → people matching Aamir.

### 6.2.3 Search behavior

- Debounce global API calls by ~250–350 ms.
- Minimum 2 characters for remote search.
- Local search can start at 1 character.
- Cache recent remote searches briefly to avoid duplicate requests.
- Highlight matching query text where practical.
- Show year in movie results to disambiguate remakes.
- Show person department/known-for titles in person results.

### 6.2.4 Search result movie card

Each global movie result should show:

- Poster thumbnail.
- Title.
- Original title if different.
- Release year.
- Main cast preview.
- TMDB rating.
- Saved/not-saved state.
- Add button for editors.
- “View details” for everyone.

### 6.2.5 Search result person card

Show:

- Profile image.
- Name.
- Known-for department.
- Up to 3 recognizable credits.
- Saved-movie count in this library.
- “Open filmography.”

---

## 6.3 Add Movie Flow

### 6.3.1 Entry points

A movie can be added from:

- Global search.
- Movie detail page.
- Actor filmography page.
- Director filmography page.
- Collection add dialog.
- Random discovery result.

### 6.3.2 Add transaction

When an editor adds a movie:

1. Validate authenticated editor status.
2. Fetch canonical TMDB movie details if not already cached.
3. Upsert movie metadata by `tmdb_id`.
4. Upsert core cast and director records.
5. Create/restore library membership.
6. Optionally add directly to one or more collections.
7. Optionally set the adding user’s watch intent.
8. Write immutable audit event.
9. Return updated saved state.

### 6.3.3 Duplicate behavior

- Same TMDB movie ID cannot appear twice as active library item.
- If previously removed, “Add” restores it rather than creating a second movie record.
- Audit history must preserve the original add, removal, and re-add events.

### 6.3.4 “Added by” provenance

Store:

- `added_by_user_id`
- `added_at`
- `source_context`
- `source_query` where appropriate
- `source_person_id` when added from a filmography
- `source_collection_id` when added while editing a collection

Example context:

```json
{
  "surface": "person_filmography",
  "route": "/people/287/jake-gyllenhaal",
  "query": null,
  "sourcePersonTmdbId": 131
}
```

---

## 6.4 Movie Detail Page

Route recommendation:

`/movie/[tmdbId]-[slug]`

### Required visual content

- Backdrop.
- Poster.
- Title.
- Original title where useful.
- Release year/date.
- Runtime.
- Genres.
- Overview.
- TMDB rating and vote count.
- Director.
- Top cast.
- Production countries/languages if available.

### Shared library state

- Saved/not saved.
- Added by.
- Added at.
- Collections containing the movie.

### Per-user state

For each editor:

- Watched / not watched.
- Last watched date/time.
- Number of watch events.
- Personal rating.
- Favorite flag if implemented.

### Combined state

Examples:

- Both watched.
- Only User A watched.
- Only User B watched.
- Neither watched.
- Both want to watch.
- Average personal rating.

### Actions for editors

- Add to library.
- Remove from library.
- Mark watched.
- Mark unwatched.
- Add another watch event / rewatch.
- Edit watched date.
- Add to collection.
- Remove from collection.
- Set rating.
- Set favorite.
- Add/edit personal note.

### Public behavior

All mutation buttons are omitted or disabled with a clear “Members only” affordance.

---

## 6.5 Watched / Unwatched System

### 6.5.1 Default display behavior

Watched movies **remain visible** by default and receive a clear watched visual state, such as:

- Check icon.
- Reduced card emphasis.
- “Watched” badge.

A filter allows watched titles to be hidden.

### 6.5.2 User-specific watched state

Watched status is per user, not a single shared boolean.

The UI must support:

- Both watched.
- User A only.
- User B only.
- Neither.

### 6.5.3 Watch history

Every watch action creates a `watch_event`.

A movie can have multiple watch events for rewatches.

Each event stores:

- user
- movie
- `watched_at`
- `created_at`
- optional note
- action source/context

Changing “current watched state” must not erase watch history.

### 6.5.4 Editing watch date

Users may record a past watch date instead of only “now.”

The audit trail records both:

- when the watch supposedly occurred (`watched_at`)
- when it was entered/edited (`created_at` / audit timestamp)

---

## 6.6 Actor / Person Pages

Route recommendation:

`/people/[tmdbPersonId]-[slug]`

### Required person header

- Profile image.
- Name.
- Known-for department.
- Basic TMDB biography metadata where available.
- Number of saved library titles involving the person.

### Saved section

Display saved movies involving this person with:

- Poster.
- Role/character or job.
- Year.
- Watched states.
- User ratings.

### Filmography section

Show broader TMDB movie credits, sorted by:

- Popularity default.
- Release year.
- TMDB rating.
- Already saved / not saved.

Editors can add unsaved titles directly from filmography.

### Progress concept

Optional display:

- `8 saved / 42 movie credits`
- `5 watched / 8 saved`

Do not frame this as “completion” if the filmography includes cameos/archive footage unless filtered.

---

## 6.7 Director Views

Directors use the same underlying person model but display director-specific context.

Required:

- Saved films directed.
- Broader directing credits.
- Watched progress.
- Sort by release year/rating/popularity.

---

## 6.8 Automatic Categories

The system should derive categories from movie metadata rather than forcing manual duplication.

Required auto-generated views:

- Actor.
- Director.
- Genre.
- Release year.
- Decade.
- Original language.
- Watched status.
- Added by.
- Watched by.
- Streaming provider where cached.

Potential later views:

- Country.
- Runtime buckets.
- Rating buckets.

---

## 6.9 Custom Collections

Examples:

- Mindfuck Movies.
- Movies to Watch Together.
- Bollywood Classics.
- 2000s Thrillers.
- Comfort Movies.
- Good Horror.
- Sunday Movies.

### Collection fields

- Name.
- Slug.
- Description.
- Cover mode: generated poster collage or chosen movie backdrop.
- Created by.
- Created at.
- Updated at.
- Optional pinned flag.
- Optional visibility field for future private collections.

### Collection functionality

- Create.
- Rename.
- Edit description.
- Add/remove movie.
- Reorder movies manually if desired.
- Sort dynamically.
- Delete/soft-delete.
- View activity history.

Every collection mutation must generate an audit event.

---

## 6.10 Filters and Sorting

### Required filters

- Actor.
- Director.
- Genre.
- Release year range.
- Decade.
- Runtime range.
- Watched status.
- Watched by specific user.
- Added by specific user.
- Rating range.
- Streaming provider.
- Original language.
- Collection.

### Required sort options

- Recently added.
- Oldest added.
- Release date newest.
- Release date oldest.
- Title A–Z.
- Title Z–A.
- TMDB rating high → low.
- Runtime short → long.
- Personal rating high → low.
- Last watched.

### Filter persistence

- Filter state should be encoded in URL query parameters where sensible.
- Example:

`/library?status=unwatched&genre=53&provider=8&runtimeMax=150`

This makes views linkable and refresh-safe.

---

## 6.11 Random “What Should We Watch?” Picker

The random picker operates on the currently eligible filtered set.

### Example constraints

- Unwatched by both.
- Available on Netflix or Prime.
- Runtime under 150 minutes.
- Thriller.

### Behavior

1. Apply selected filters.
2. Show candidate count before choosing.
3. Randomly choose from eligible saved movies.
4. Show a reveal card with poster/backdrop.
5. Allow “Pick again.”
6. Do not mark watched automatically.
7. Log picker usage only if analytics is enabled; do not pollute audit logs unless a state change occurs.

---

## 6.12 Streaming Availability

### Data source

Use TMDB watch-provider endpoints, which expose provider availability by region and are backed by JustWatch data.

### Region behavior

- Default region: India (`IN`).
- User can change region for viewing.
- Persist selected region in local storage or user preference.

### Display groups

- Stream / flatrate.
- Free/ad-supported if provided.
- Rent.
- Buy.

### Provider card

Show:

- Provider logo.
- Provider name.
- Availability type.
- “Last checked” time if using cached data.

### Caching

To support provider filtering without calling TMDB for every card render:

- Cache provider snapshots per movie + region.
- Treat snapshots older than 24 hours as stale.
- Stale data can still be displayed with a “last checked” indicator until refreshed.
- Refresh on movie detail access or explicit refresh.

### Legal/UX requirement

Show required TMDB and JustWatch attribution in the product credits/footer where watch-provider data is used.

---

## 6.13 Personal Ratings

### Format

Use a 10-point scale with half-point support, e.g. `8.5/10`.

Reason: granular enough for two users and maps naturally to movie rating conventions.

### Rules

- Rating is per user.
- Rating can be set only by authenticated editors.
- Rating may exist even if the movie is not currently marked watched, but UI should gently encourage rating watched titles.
- Combined rating = arithmetic mean of available editor ratings.
- Rating changes are audited.

---

## 6.14 Notes

Optional but recommended.

- Personal notes are private to editors by default.
- Notes do not render publicly unless a future “public review” feature is intentionally added.
- Note create/update/delete actions are audited at metadata level, but the full note text should not be duplicated into audit logs.

---

## 6.15 Activity / Audit Log System

This is a first-class product requirement, not an implementation afterthought.

### 6.15.1 Goals

The system must answer:

- Who performed the action?
- What action occurred?
- Which entity was affected?
- Where in the application did it happen?
- How was the action initiated?
- When did it happen?
- What relevant state changed?

### 6.15.2 Events that must be logged

At minimum:

- Movie added.
- Movie removed/archived.
- Movie restored/re-added.
- Movie metadata manually refreshed.
- Movie added to collection.
- Movie removed from collection.
- Collection created.
- Collection renamed.
- Collection description edited.
- Collection deleted/archived.
- Watched state marked true.
- Watched state marked false.
- Watch event recorded.
- Watch event date corrected.
- Rating created.
- Rating changed.
- Rating removed.
- Favorite toggled if feature enabled.
- Personal note created/updated/deleted.
- Profile preference changed if relevant.
- Provider snapshot manually refreshed if desired as a system event.

### 6.15.3 Audit record structure

Each event should include:

- `id`
- `actor_user_id`
- `actor_display_name_snapshot`
- `action`
- `entity_type`
- `entity_id`
- optional `movie_id`
- optional `collection_id`
- `source_surface`
- `source_route`
- `interaction_method` (`button`, `keyboard`, `bulk_action`, `server_refresh`, etc.)
- `before_state` small JSON patch/snapshot
- `after_state` small JSON patch/snapshot
- `metadata` JSONB
- `created_at`

### 6.15.4 What must not be logged by default

- Passwords.
- Auth tokens.
- API keys.
- Full IP addresses.
- Precise geolocation.
- Sensitive note body content.
- Provider secrets.

### 6.15.5 Activity UI

Add `/activity`.

Filters:

- User.
- Action type.
- Movie.
- Collection.
- Date range.

Examples:

- `Ansh added Prisoners from Jake Gyllenhaal’s filmography — 5 Oct 2026, 9:42 PM`
- `Khushi marked Prisoners as watched — 6 Oct 2026, 12:14 AM`
- `Ansh changed his rating for Prisoners from 8.5 to 9.0 — 6 Oct 2026, 12:18 AM`
- `Khushi added Inception to “Mindfuck Movies” — 7 Oct 2026, 8:02 PM`

### 6.15.6 Append-only requirement

Audit events are immutable to ordinary application users.

- No UI to edit/delete audit entries.
- Database policies prevent editor updates/deletes.
- Only trusted system/admin operations may prune data if ever required.

---

## 6.16 Public Portfolio Presentation

The public build should be portfolio-friendly without feeling like a fake demo.

### Requirements

- Public URL works without login.
- Home page explains the product in one concise line, not a marketing essay.
- Login remains available in the header/profile menu.
- Public visitors can explore real data.
- Editing controls are absent or clearly restricted.
- Include a small “About this project” modal/page with stack and architecture summary.
- Add Open Graph metadata for sharing.
- Add favicon, sitemap, robots.txt, structured metadata where sensible.

---

## 6.17 Empty, Loading, and Error States

Every major screen needs intentional states.

### Search empty

> No matches found. Try a different title or person.

### Empty library

For editors:

> Your vault is empty. Search for the first movie to add.

For public visitors:

> No movies have been added yet.

### Provider unavailable

> Streaming availability is not currently listed for India.

Do not imply a movie is unavailable everywhere just because provider data is absent.

### API failure

- Preserve current page.
- Show retry action.
- Never clear saved local UI state unnecessarily.

---

## 7. Information Architecture / Routes

Recommended routes:

```text
/
/library
/search?q=
/movie/[tmdbId]-[slug]
/people/[tmdbPersonId]-[slug]
/actors
/directors
/genres
/collections
/collections/[slug]
/activity
/login
/about
/settings                  # authenticated only
/api/tmdb/search
/api/tmdb/movie/[id]
/api/tmdb/person/[id]
/api/tmdb/person/[id]/credits
/api/tmdb/movie/[id]/providers
/api/provider-cache/refresh
```

Optional future routes:

```text
/stats
/year/[year]
/decade/[decade]
/provider/[providerId]
```

---

## 8. UX Requirements

### 8.1 General

- Desktop-first polish but fully responsive.
- Mobile support is required.
- Navigation should never exceed one primary header plus contextual controls.
- Avoid modal-overload.
- Poster grids should remain the dominant visual language.
- No horizontal overflow on mobile.

### 8.2 Performance perception

- Use skeletons for poster cards.
- Optimistically update simple editor actions where safe.
- Lazy load lower poster rows.
- Use Next Image for image optimization where compatible with TMDB image domains.

### 8.3 Keyboard

- `/` focuses search.
- `Esc` closes dialogs.
- Enter selects highlighted search result where accessible.

### 8.4 Accessibility

- WCAG AA contrast target.
- Keyboard navigable dialogs and menus.
- Visible focus states.
- All posters need useful alt text.
- Icon-only buttons require accessible labels.

---

## 9. Data Integrity Rules

1. `movies.tmdb_id` is unique.
2. Active library membership per movie is unique.
3. Users may have at most one current `user_movie_state` per movie.
4. Watch events are append-only except explicit correction workflow.
5. Audit events are append-only.
6. Collection slug unique among active collections.
7. Same movie cannot appear twice in the same collection.
8. Ratings constrained to 0.5–10 in 0.5 increments.
9. Only authorized editor UUIDs can mutate shared content.
10. Soft-delete records where history matters.

---

## 10. Analytics and Privacy

Analytics is optional for V1.

If enabled:

- Prefer privacy-friendly analytics such as Vercel Web Analytics.
- Do not send audit-log payloads to analytics.
- Do not log search text containing accidental personal information beyond normal application telemetry.
- No ad trackers.

---

## 11. Functional Acceptance Criteria

### Search

- Searching “Inception” returns relevant TMDB movie results.
- Searching “Jake Gyllenhaal” returns a person result and filmography path.
- Saved state is visible in global results.

### Add movie

- Editor can add a movie in ≤2 interactions from search result.
- Public user cannot add through UI or direct database call.
- Duplicate active saves are impossible.
- Audit event is written.

### Watch status

- Each editor can independently mark a title watched.
- Watched title remains in the library.
- “Unwatched” filter hides it for relevant user context.
- Watch event contains accurate watched_at.

### Collections

- Editor can create collection and add movie.
- Duplicate collection membership is rejected.
- Audit trail records both actions.

### Providers

- Movie detail can display providers for region `IN` when data exists.
- Provider cache indicates freshness.

### Public demo

- Unauthenticated user can browse core pages.
- Unauthenticated user cannot mutate any protected data even if API calls are manually attempted.

### Audit

- Every mutation listed in section 6.15 creates an immutable event.
- Activity feed can filter by user/action/date.

---

## 12. Non-Functional Requirements

### Performance targets

- Lighthouse performance target: 90+ on typical public pages after production optimization.
- LCP target: under ~2.5 s on good broadband for cached pages.
- Search local results: perceived instant.
- Remote search response rendered as soon as API returns, without full page navigation.

### Reliability

- TMDB outage should not make saved library unusable.
- Existing cached movie metadata continues to render.
- Supabase transient failure should produce recoverable error UI.

### Security

See `SECURITY.md`.

### Maintainability

- Strict TypeScript.
- Schema validation for external APIs.
- Shared domain types.
- No giant page components containing data logic + UI + mutations.

---

## 13. Cost Constraint

Target ongoing cost: **₹0/month** for normal personal/project use.

Expected services:

- Vercel Hobby.
- Supabase Free.
- TMDB non-commercial API usage.
- GitHub Free.

Optional custom domain is the only expected recurring purchase.

The product must not require:

- EC2.
- Paid VPS.
- Paid database.
- Docker hosting.
- Redis.
- Managed queue.
- Dedicated cron infrastructure.

---

## 14. V1 Scope — Must Ship

1. Public library.
2. Two-user auth.
3. No public signup.
4. TMDB movie/person search.
5. Add/remove movie.
6. Movie detail pages.
7. Actor/person pages.
8. Dynamic actor/director/genre grouping.
9. Per-user watched state.
10. Watch history.
11. Personal ratings.
12. Collections.
13. Search/filter/sort saved library.
14. Streaming availability for India.
15. Provider cache.
16. Random picker.
17. Full audit/activity system.
18. Responsive dark cinematic design.
19. RLS-secured database.
20. Vercel deployment.

---

## 15. V1.1 / Nice-to-Have

- Favorites.
- Personal notes.
- Stats dashboard.
- Rewatch count badges.
- Compare both users’ ratings.
- Collection cover generator.
- Import/export JSON.
- Shareable filtered library links.
- PWA install support.

---

## 16. Future Expansion

Potential later features:

- TV series support.
- Episode progress.
- Private collections.
- More invited friends with role model.
- Recommendation engine based on library/watch history.
- Natural-language filters.
- Calendar planning for movie nights.
- Review text.
- Watch-party voting.
- Yearly recap.

These must not complicate V1 architecture prematurely.

---

## 17. Definition of Done

V1 is considered complete only when:

- Both editors can authenticate and collaborate on the same library.
- Public visitors can explore without login.
- Public visitors cannot mutate data through UI or direct requests.
- Search works for both movies and people.
- Movies can be added once and appear automatically under related actors/directors/genres.
- Watched state is per-user.
- Watch history is preserved.
- Collections work.
- Provider availability works for India where data exists.
- Audit logs cover all major mutations and are immutable.
- Mobile UI is usable.
- Critical flows are covered by automated tests.
- Deployment is reproducible from GitHub to Vercel.
- No secrets are exposed client-side.
- The project can be confidently linked from a portfolio.
