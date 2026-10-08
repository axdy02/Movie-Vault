import { PGlite } from '@electric-sql/pglite'
import { readdir, readFile } from 'node:fs/promises'

// PGlite executes real PostgreSQL (including roles, grants, RLS, constraints,
// triggers and transactions). Only Supabase's JWT-to-SQL identity bridge is
// emulated here; authorization policies/functions are the production migration.
export async function createTestDatabase() {
  const db = new PGlite()
  await db.exec(`
    create role anon noinherit;
    create role authenticated noinherit;
    create role service_role noinherit bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$;
    create function auth.role() returns text language sql stable as $$
      select nullif(current_setting('request.jwt.claim.role', true), '');
    $$;
    grant usage on schema auth to anon, authenticated, service_role;
    grant execute on function auth.uid(), auth.role() to anon, authenticated, service_role;
  `)
  const migrations = await readdir(new URL('./migrations/', import.meta.url))
  for (const file of migrations
    .filter((file) => file.endsWith('.sql'))
    .sort()) {
    await db.exec(
      await readFile(new URL(`./migrations/${file}`, import.meta.url), 'utf8'),
    )
  }
  return db
}
