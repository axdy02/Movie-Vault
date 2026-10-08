import 'server-only'
import { z } from 'zod'
const optional = (schema: z.ZodType<string>) =>
  z.preprocess((value) => {
    const normalized = typeof value === 'string' ? value.trim() : value
    return normalized === '' ? undefined : normalized
  }, schema.optional())
const httpUrl = z.string().refine((value) => {
  if (!/^https?:\/\//i.test(value)) return false
  try {
    const url = new URL(value)
    return (
      Boolean(url.hostname) &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash
    )
  } catch {
    return false
  }
}, 'Use a full http:// or https:// URL without credentials, query parameters or fragments.')
const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: optional(httpUrl),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: optional(z.string().min(1)),
  NEXT_PUBLIC_SITE_URL: httpUrl.default('http://localhost:3000'),
  NEXT_PUBLIC_DEFAULT_REGION: z
    .string()
    .regex(/^[A-Z]{2}$/)
    .default('IN'),
  TMDB_READ_ACCESS_TOKEN: optional(z.string().min(1)),
  SUPABASE_SERVICE_ROLE_KEY: optional(z.string().min(1)),
})
export function getEnv() {
  const result = envSchema.safeParse(process.env)
  if (!result.success) {
    const fields = [
      ...new Set(result.error.issues.map((issue) => issue.path.join('.'))),
    ].join(', ')
    // Never include the rejected values: a misplaced key may occupy a URL field.
    throw new Error(
      `Invalid environment configuration for ${fields}. Check .env.local and .env.example; URL values must begin with http:// or https://.`,
    )
  }
  const env = result.data
  if (
    Boolean(env.NEXT_PUBLIC_SUPABASE_URL) !==
    Boolean(env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  )
    throw new Error('Configure both Supabase URL and anon key.')
  return env
}
export function isSupabaseConfigured() {
  const env = getEnv()
  return Boolean(
    env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )
}
