# SECURITY — Movie Vault

## 1. Security Model

The app is public-read/private-write.

Security must assume that a public visitor can inspect JavaScript, discover API endpoints, and manually issue requests.

Therefore, “button hidden” is never considered authorization.

---

## 2. Authentication

- Supabase Auth.
- Only two pre-authorized accounts.
- No public registration page.
- Do not expose admin user-creation APIs to the client.
- Session stored using Supabase SSR-compatible secure cookies.
- Production cookies must be Secure where applicable.

---

## 3. Authorization

### Database

Every application table must have RLS enabled.

Public/anon role:

- SELECT only through safe tables/views.
- no INSERT.
- no UPDATE.
- no DELETE.

Authenticated role:

- mutation allowed only when `auth.uid()` maps to an active editor in `profiles`.

Suggested policy predicate:

```sql
exists (
  select 1
  from profiles p
  where p.id = auth.uid()
    and p.is_active = true
    and p.role = 'editor'
)
```

---

## 4. Secrets

Never expose:

- TMDB bearer token.
- Supabase service-role key.

Allowed client-side values:

- Supabase project URL.
- Supabase anon key.

The anon key is not a secret; RLS must make it safe.

---

## 5. TMDB Proxy

Browser must not call TMDB with the private bearer token.

All sensitive TMDB requests go through Next.js server routes.

Route requirements:

- validate query parameters
- cap query length
- reject malformed IDs
- use timeout
- return transformed response only
- avoid returning raw headers/tokens

---

## 6. Input Validation

Validate all mutation payloads with Zod.

Examples:

- TMDB ID: positive integer.
- rating: 0.5–10, 0.5 step.
- collection name: 1–80 chars.
- collection description: max ~1000 chars.
- note: max configured limit.
- region code: ISO alpha-2 uppercase.

Never trust route params or client-generated UUIDs without validation.

---

## 7. XSS / Content Safety

- React text escaping is sufficient for plain text.
- Do not render user-entered HTML.
- Notes and collection descriptions remain plain text or sanitized markdown.
- If markdown is introduced, use a strict sanitizer.

---

## 8. SQL Injection

Use Supabase query builder / parameterized SQL functions.

Never concatenate user input into raw SQL.

---

## 9. CSRF

Use Supabase session cookies and Next.js mutation patterns designed for same-origin operations.

For custom route handlers that mutate:

- require authenticated session
- enforce method
- consider Origin/Host checks
- avoid GET mutations

---

## 10. Rate Limiting

V1 has low risk, but protect external search endpoints from abuse because the site is public.

Minimum controls:

- debounce client requests
- cache repeated queries
- server-side query length limits
- optional lightweight IP-based or platform rate limit if abuse appears

Do not build Redis solely for V1 rate limiting.

---

## 11. Audit Security

Audit table is append-only.

Editors:

- can read allowed activity
- cannot update/delete audit events

System:

- can insert via trusted function/trigger

Audit payload must never contain:

- passwords
- session tokens
- API keys
- full authorization headers
- full IP addresses by default
- private note bodies

---

## 12. Private Data

The product should not display editor email addresses publicly.

Public UI should use display names only.

Personal notes are private by default.

---

## 13. Security Headers

Recommended headers:

- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` disabling unused capabilities
- CSP tuned for Vercel/Supabase/TMDB images
- HSTS handled by HTTPS deployment once custom domain is stable

Avoid overly broad `script-src *` or `connect-src *`.

---

## 14. Content Security Policy Domains

Expected external origins may include:

- Supabase project domain
- TMDB image CDN
- Vercel analytics endpoints if enabled

TMDB API itself should be contacted from server-side routes, reducing browser `connect-src` surface.

---

## 15. File Uploads

No file uploads are required for V1.

Avoid adding storage complexity until a real requirement exists.

---

## 16. Error Handling

Public error responses must not expose:

- SQL details
- environment variables
- stack traces in production
- Supabase service-role errors with sensitive context

Return stable error codes/messages.

---

## 17. Security Acceptance Tests

Required tests:

1. Anonymous SELECT of public library succeeds.
2. Anonymous INSERT movie/library item fails.
3. Anonymous UPDATE watched state fails.
4. Anonymous DELETE collection fails.
5. Authenticated non-whitelisted user mutation fails if such an account can exist.
6. Active editor mutation succeeds.
7. Audit event cannot be updated/deleted by editor.
8. Service-role key absent from browser bundle.
9. TMDB token absent from browser bundle.
10. Public activity feed does not expose personal notes or emails.
