# V1 requirements traceability

Status and exact verification results are maintained in IMPLEMENTATION_STATUS.md. This file maps mandatory requirements to implemented boundaries and verification paths. Local results and pending hosted acceptance are recorded separately in IMPLEMENTATION_STATUS.md.

| Requirement                                           | Implementation boundary                                     | Verification                                                                                   |
| ----------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Public browse, no public mutations                    | Public query RPC, RLS/restricted grants, server actions     | PostgreSQL anonymous read/insert/update/delete denial; public E2E                              |
| Exactly two approved editors; no signup               | Supabase SSR login, profiles/provisioning guard, Auth setup | Anonymous/non-editor/deactivated editor denial, active editor success; cloud login after setup |
| Canonical movie, unique TMDB identity                 | movies/library_items constraints, add transaction           | Duplicate add/concurrent-safe retry, removal/restore, audit and rollback                       |
| Metadata/genres/cast/director relations               | Validated TMDB DTO, movie_genres/movie_people               | Missing-field transforms, grouping after add, refresh preserves app state                      |
| Global unified movie/person search                    | Server TMDB proxy, local-first combobox                     | Min length, debounce, stale request cancellation, dedup, keyboard                              |
| Add from search/detail/person/collection              | Shared protected add action and context                     | Provenance and collection membership, immutable actor identity                                 |
| Homepage sections/stats                               | Vault queries, poster/people/collection views               | Empty library; watchlist per editor; recent watches from events                                |
| Movie detail                                          | Saved database metadata + TMDB fallback                     | Public buttons omitted; missing images/runtime; removed old URLs                               |
| Actor/director filmography                            | Person/credits API, dynamic relational views                | Acting/directing separation, duplicate credits, sorting and saved state                        |
| Watch state per user                                  | user_movie_state and watch transaction                      | Two users independently; watch creates event+audit; unwatch retains history                    |
| Watch/rewatch/correction history                      | watch_events replacement relation                           | Rewatch count, correction retains original+audit, current last-watch consistency               |
| Ratings 0.5–10 in half steps                          | Zod + DB constraint + audited RPC                           | Invalid/valid/null values, averages, set/change/removal audit                                  |
| Collections/create/edit/archive/membership            | collections/collection_items and RPCs                       | Unique active slug/member, soft removal/readd history, audits                                  |
| Categories actor/director/genre/year/decade/language  | Normalized relations and filters                            | No duplicate canonical rows; combined filters                                                  |
| All filters + sorts + URL persistence                 | features/library/filters.ts, filter UI                      | Parse/serialize, ranges, watched/added users, providers, back/forward                          |
| Regional streaming categories, default IN             | Provider transform/snapshot server path                     | All five offer types, regional empty, freshness, refresh failure retains cache                 |
| Random picker active filtered candidates              | Rejection-sampled crypto RNG + UI                           | Eligible subset only, zero candidates, no automatic watch                                      |
| Immutable audit for each mutation                     | Transactional RPCs + immutable triggers                     | Actor, event type/source/time, before/after, denial of tampering, rollback                     |
| Activity user/action/movie/collection/date/pagination | Sanitized feed + editor detail query                        | Public private-field exclusion, filtered pages, timestamps                                     |
| Responsive cinematic/accessibility/motion             | Tokens, Radix UI, Motion, semantic components               | Mobile overflow/touch, keyboard/focus/dialog, reduced motion                                   |
| Errors/loading/empty/pending/success                  | Route boundaries + mutation feedback                        | Timeout/stale cache/API errors, unauthorized action, empty states                              |
| Secrets/server-only headers/validation                | env/server-only modules, Next headers                       | Build bundle scan, malformed inputs, no unsafe HTML                                            |
| SEO/metadata/attribution                              | layout/about/footer/robots/sitemap/OG/icon                  | Public routes; official TMDB/JustWatch notices                                                 |
| Reproducible deployment at free-tier cost             | SQL migrations, lockfile, setup/deploy guides/CI            | Clean npm ci/build/checks; live release checklist pending setup                                |

Optional V1.1 items are not release substitutes for the mandatory rows above.
