# Deploy and operate Movie Vault

## Prerequisites

Complete SETUP.md, apply migrations and provision both editors first. V1 must not be declared production verified until live Auth, direct database denial tests and real TMDB calls succeed.

Use a personal GitHub repository, Vercel Hobby where your project is eligible, Supabase Free and eligible TMDB developer API access. No paid infrastructure is required by the implementation. Free tiers have quotas and terms; verify eligibility before publishing. Vercel describes Hobby as personal/non-commercial in its [plan documentation](https://vercel.com/docs/plans/hobby).

## 1. Put the source on GitHub

The source repository is [axdy02/Movie-Vault](https://github.com/axdy02/Movie-Vault), with private visibility and `main` as the default branch. To work from a fresh checkout with access to that repository:

```powershell
git clone https://github.com/axdy02/Movie-Vault.git
Set-Location Movie-Vault
npm ci
Copy-Item .env.example .env.local
```

Follow SETUP.md to fill the private environment file. Before future commits, inspect `git status`: `.env.local`, `.next`, `node_modules`, generated test artifacts and credentials must be absent. Never paste a token into a Git remote URL. Vercel deployment remains pending.

## 2. Connect Vercel

Import the repository from the Vercel dashboard. Select the Next.js framework preset, root directory `.` and Node.js 22 or newer. The build command is `npm run build`; npm uses the committed lockfile. The default Next.js preset handles server routes and actions; no custom backend or Docker server is needed.

Add environment variables using Vercel's private project settings:

| Variable                      | Exposure    | Purpose                                                           |
| ----------------------------- | ----------- | ----------------------------------------------------------------- |
| NEXT_PUBLIC_SUPABASE_URL      | Public      | Production project URL                                            |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Public      | RLS-protected anonymous access                                    |
| NEXT_PUBLIC_SITE_URL          | Public      | Canonical HTTPS production URL                                    |
| NEXT_PUBLIC_DEFAULT_REGION    | Public      | `IN`                                                              |
| TMDB_READ_ACCESS_TOKEN        | Server only | TMDB bearer token                                                 |
| SUPABASE_SERVICE_ROLE_KEY     | Server only | Required for full V1 persistent provider cache and manual refresh |

Use a separate development/test Supabase project for preview branches if possible. Avoid pointing experimental previews at production data. No Auth-admin API is exposed in the app. The service-role key is never used to bypass editor authorization for normal mutations.

## 3. Production Auth configuration

Set the Supabase Auth Site URL to the canonical production HTTPS URL and allow only the intended local/deployment redirect URLs. Disable new-user signup and anonymous sign-ins in the hosted project's dashboard. Confirm the existing two approved users can still sign in.

The application uses same-origin password login and safe local return routes. If you later add passwordless/invite callback handling, implement and verify the callback before enabling it; do not broadly allow arbitrary redirect origins.

## 4. Migration and release order

1. Back up production using available provider tools or a database export before a schema change.
2. Test the migration on a test project and execute `npm test`, types, lint and build.
3. Review the Supabase CLI dry-run output, then apply schema changes before deploying dependent application code.
4. Deploy the reviewed commit through Vercel.
5. Run the acceptance checks below. Treat a security failure as a release blocker.

Do not edit production-only table structures. Every change belongs in a migration. The initial schema is designed to preserve watch/audit and removed membership history.

## 5. Live release acceptance checklist

- [ ] Public home/library/people/collections/activity work without a session.
- [ ] Anonymous INSERT/UPDATE/DELETE attempts fail directly against protected tables/RPCs.
- [ ] Non-approved authenticated user and inactive editor cannot mutate.
- [ ] Both provisioned editors can log in; signup through the Auth API is denied.
- [ ] Movie add, duplicate retry, remove and restore preserve canonical identity and audits.
- [ ] Watch/unwatch/rewatch/date correction and half-step ratings work independently per editor.
- [ ] Collections and membership changes produce immutable audited transactions.
- [ ] Editors cannot insert forged audits or update/delete existing audits.
- [ ] Public responses contain no personal notes, emails, passwords, raw audit snapshots or secrets.
- [ ] Search works for movies and people; stale remote results cannot replace newer queries.
- [ ] India providers and region changes work where data is listed; cached data survives TMDB failure.
- [ ] Combined filters and random picker share the same eligible movies; URL state survives navigation.
- [ ] Mobile navigation/search/dialogs/filter sheet work without horizontal overflow.
- [ ] Production browser assets pass `npm run check:secrets`.
- [ ] Lighthouse on home/library/movie detail and keyboard/reduced-motion checks meet target or have recorded measured limitations.
- [ ] TMDB and JustWatch notices remain visible.

Record the environment, date, tested commit, checks and measured results in IMPLEMENTATION_STATUS.md. The local embedded PostgreSQL tests verify migration logic; they do not prove hosted Auth configuration, PostgREST grants or cloud connectivity by themselves.

## Rollback

Use Vercel's previous known-good deployment if application code fails after release. Database rollback requires a separately reviewed corrective migration; do not delete tables, watch history or audit rows to match older code. Prefer forward fixes and backward-compatible migrations. If authorization fails, restrict the deployment while repairing policies, then repeat direct-request acceptance tests.

Keep server logs private. If a server key is ever exposed, rotate it in the provider dashboard and update private environment variables before redeploying.
