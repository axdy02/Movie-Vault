# Set up Movie Vault

## 1. Install and start

Use Node.js 22 or newer and npm. In PowerShell:

```powershell
Set-Location 'C:\Users\User\Documents\Movie Vault GPT'
npm ci
Copy-Item .env.example .env.local
```

Do not commit `.env.local`. The public Supabase anon key is safe to expose only because database authorization is enforced independently.

## 2. Create a Supabase project

Create a free project from the [Supabase dashboard](https://supabase.com/dashboard). Save its database password privately. Copy the project URL and anon key from the project's API settings into `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_DEFAULT_REGION=IN
```

Use the full **project API URL** from the Connect dialog, starting with `https://`. The `db.PROJECT_REF.supabase.co` hostname is for direct PostgreSQL connections and must not be used here. The current Supabase publishable key (`sb_publishable_...`) goes in this app's `NEXT_PUBLIC_SUPABASE_ANON_KEY` variable; a legacy public anon key also works. Keep these variable names as shown because the code reads them directly.

For the full V1 setup, also set `SUPABASE_SERVICE_ROLE_KEY` privately. It enables persistent provider snapshots during public movie-detail access and authorized editor provider refresh. Base browsing works without it, but persistent provider caching and manual refresh require it. Editor content mutations always use their authenticated session instead. Never prefix this key with `NEXT_PUBLIC_`.

Use the current server-only secret key (`sb_secret_...`) or the legacy service-role key for that variable. Find keys in Settings → API Keys; the [official key guide](https://supabase.com/docs/guides/getting-started/api-keys) explains both formats.

## 3. Apply the database migration

For a new project, open the Supabase SQL Editor in your private administrator context. Paste and execute the files in `supabase/migrations/` in filename order. Check each succeeds before proceeding. The migration creates the tables, constraints, indexes, RLS policies, transactional RPCs and sanitized public views. Do not disable RLS to fix an authorization error.

For repeatable production workflows, install the Supabase CLI separately according to its [official installation guide](https://supabase.com/docs/guides/local-development/cli/getting-started), authenticate, link your project and push migrations:

```powershell
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push --dry-run
supabase db push
```

The `supabase/config.toml` file disables local signup. Production hosted Auth must also be configured in the dashboard; local configuration does not update the hosted project's settings automatically. A full Docker development environment is optional and is not a production dependency.

## 4. Disable public signup and create exactly two editors

In Supabase Authentication settings, turn off **Allow new users to sign up** and anonymous sign-ins. Keep email/password login enabled. This is a service configuration step, independent of hiding signup in the UI. See [Supabase general Auth configuration](https://supabase.com/docs/guides/auth/general-configuration).

In the private Authentication → Users screen, create the two approved accounts using the administrator **Add user / Create user** workflow with a password and a confirmed email. Use each person's real approved email only in Supabase, not in this repository. Each person should choose a private password through a trusted process. The app uses password login; do not send invite links until you have configured a supported password-setup flow. Supabase also supports private admin invitations, as described in its [user management documentation](https://supabase.com/docs/guides/auth/users).

Copy each existing Auth user's UUID. Open `supabase/provision-editors.sql`, replace the two placeholder UUIDs and display names, and run it once in the trusted SQL Editor. The slots are `1` and `2`. Public clients and editors cannot provision profiles or change their own role. Keep UUIDs and email/password records out of public screenshots. The database prevents a third editor slot.

If a UUID does not exist in Supabase Auth, provisioning deliberately fails. Do not remove the foreign key. If you need to replace an editor, use a reviewed administrative transaction and retain historical profile references rather than deleting history.

## 5. Get the TMDB token

Create a TMDB account, then request a developer API credential from account settings on a desktop browser. Follow [TMDB getting started](https://developer.themoviedb.org/docs/getting-started) and confirm your usage is eligible under the applicable terms. Copy the **API Read Access Token** into:

```dotenv
TMDB_READ_ACCESS_TOKEN=YOUR_READ_ACCESS_TOKEN
```

This is the bearer token, not the shorter v3 API key. It is consumed by server-only requests. Keep the displayed TMDB notice and JustWatch attribution. The app uses the TMDB-returned watch landing link and does not invent streaming playback links. Requirements are described by [TMDB attribution guidance](https://developer.themoviedb.org/docs/faq) and the [watch-provider reference](https://developer.themoviedb.org/reference/movie-watch-providers).

## 6. Test the real product

Restart after changing environment variables:

```powershell
npm run dev
```

1. Open `/` logged out and confirm public browsing and search work.
2. Open `/login` and sign in with the first approved account.
3. Search a movie and select **Add to Vault**. Open `/library` and its detail page.
4. Mark watched, record a rewatch with a past date, correct a date, then mark unwatched. Check retained history and `/activity`.
5. Set a half-step rating, change it and remove it. Check activity entries.
6. Create a collection, add the film, remove it and re-add it. Verify each activity entry.
7. Sign out, sign in as the second editor and confirm their watched state and rating are independent.
8. Check streaming data for `IN`, switch regions, and confirm missing provider data says it is not currently listed.
9. Check both desktop and mobile. Logged-out sessions must have no edit controls.

For release verification, also issue direct anonymous and non-approved authenticated requests against your **test** project; the database must deny mutations even if someone bypasses the UI. Never run destructive integration suites on production.

## 7. Run local checks and generate types

```powershell
npm run typecheck
npm run lint
npm test
npm run test:database
npm run build
npm run check:secrets
npx playwright install chromium
npm run test:e2e
```

For browser checks against the optimized production build, set `$env:PLAYWRIGHT_PRODUCTION='1'` before `npm run test:e2e`; this starts the built app on port 3001. Remove that environment variable afterward to return to development checks. CI uses this production mode.

The persistent editor E2E journey is skipped without explicit test configuration. Point the local app at a dedicated Supabase **test** project with both provisioned accounts and TMDB configured, set `E2E_TEST_PROJECT=1`, `E2E_EDITOR_EMAIL` and `E2E_EDITOR_PASSWORD` privately, and run Playwright. This journey writes real watch, rating, collection and audit records; never enable it against production. Only discovery presentation is fixture-backed. The PostgreSQL security suite runs locally without cloud credentials.

`npm run db:types` regenerates committed database types from the migration in local PostgreSQL test infrastructure. To compare directly with a hosted Supabase project after migration, use the official CLI:

```powershell
supabase gen types typescript --project-id YOUR_PROJECT_REF --schema public | Out-File -Encoding utf8 src/types/database.ts
npm run typecheck
```

Commit the generated output only after checking it matches the migration. Do not independently maintain handwritten table interfaces.

## Troubleshooting

| Symptom                                               | Check                                                                                  |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Setup state / empty unconfigured vault                | Supply both Supabase URL and anon key, then restart                                    |
| Remote search unavailable                             | Verify server-only TMDB bearer token and network access                                |
| Login succeeds but editing denied                     | Auth UUID must match an active provisioned profile slot                                |
| Public signup still succeeds                          | Disable signup in hosted Auth settings, not just local config                          |
| Vault connection error                                | Migration must be applied completely; check private server logs                        |
| Film already saved                                    | Canonical TMDB ID is unique; the add operation safely reuses it                        |
| No provider listed                                    | Data is regional and incomplete; absence is not proof of unavailability                |
| Old provider information                              | Refresh on detail access or use editor refresh; stale data stays usable on API failure |
| Test browser missing                                  | Run `npx playwright install chromium`                                                  |
| Development packages fail under a restrictive sandbox | Permit the runner to read its own module paths; do not weaken application security     |

Technical logs must stay server-side and omit secrets. Public UI uses stable recoverable messages.
