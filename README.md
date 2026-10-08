# Movie Vault

A cinematic shared movie library built with Next.js, Supabase and TMDB. Everyone can browse; two approved members can curate films, create collections and track their own watches and ratings.

Source repository: [axdy02/Movie-Vault](https://github.com/axdy02/Movie-Vault).

## Documents

- `PRD.md` — Product requirements and exact feature scope.
- `TRD.md` — Technical requirements and approved implementation stack.
- `ARCHITECTURE.md` — System architecture, data flow, rendering, caching, write paths.
- `DATABASE.md` — Postgres/Supabase schema and data rules.
- `SECURITY.md` — Auth, RLS, secrets, API, audit and public-demo security requirements.
- `DESIGN_SYSTEM.md` — Visual language, tokens, components, responsive behavior and accessibility.
- `CODE_STYLE.md` — TypeScript, Next.js, naming, data access and coding conventions.
- `TESTING.md` — Unit, integration, E2E, RLS, audit and regression requirements.
- `AGENTS.md` — Source-of-truth instructions for Codex/other coding agents.

## Core Product in One Sentence

A public-read, two-user-private-write cinematic movie vault where movies are discovered through TMDB, organized automatically by people/genres plus custom collections, tracked independently per user, matched with regional streaming availability, and backed by immutable activity logs.

## Run locally

Install Node.js 22 or newer, open a terminal in this directory, then run:

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. Without service credentials, the app renders its real public shell with an explicit setup state and empty vault. It does not create fake movies, fake users, or localStorage persistence. Follow [SETUP.md](SETUP.md) to connect Supabase and TMDB before testing real saves and editor login.

## Engineering checks

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm run check:secrets
npx playwright install chromium
npm run test:e2e
```

Database integration tests execute the SQL migration in PGlite, an actual PostgreSQL engine, with anonymous, authenticated, service and administrator roles. They test database grants, RLS, transaction behavior and audits without mocking authorization. PGlite is a development dependency only. Supabase Auth and the production gateway still need the separate live acceptance checks described in [DEPLOYMENT.md](DEPLOYMENT.md).

## Implementation reference

- [REQUIREMENTS.md](REQUIREMENTS.md): mandatory V1 requirements mapped to implementation and verification.
- [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md): current implementation, executed checks and outstanding external verification.
- [SETUP.md](SETUP.md): beginner-friendly service setup and local development.
- [DEPLOYMENT.md](DEPLOYMENT.md): GitHub/Vercel release and rollback process.
- `supabase/migrations/`: reproducible PostgreSQL schema and security boundaries.
- `supabase/provision-editors.sql`: trusted administrator-only provisioning template.
- `src/types/database.ts`: generated schema types; see setup guide for regeneration.

Normal content changes are made through the product UI. Manual SQL is reserved for schema migrations, trusted editor provisioning and administrative recovery.

## Browse and sort

Homepage previews fill two rows at the current screen width, with the complete lists available through the section links. Performers with more top-five billed appearances in saved films appear first in the homepage people preview.

Actors and directors can be sorted by most saved films, average film rating, name or watched-film count. Actors also support most lead roles and cast-position filters: all cast, top five billed, top three billed and supporting cast (positions six onward). These are billing groups from TMDB rather than a fame score; unlisted positions remain available under All cast.

Genres and collections can be ranked by film count, average TMDB rating, name and watched films. Collections also offer pinned-first and creation-date ordering. Movie lists include popularity, rating, release date, title and the existing personal options; saved person films and their wider filmographies have independent sort controls. Choices persist in the URL. Directory rankings use distinct saved films, exclude missing ratings and count a film once when either member has watched it.
