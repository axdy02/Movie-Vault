'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { publicError } from '@/lib/auth/errors'
import { requireEditor } from '@/lib/auth/require-editor'
import { safeReturnPath } from '@/lib/auth/return-path'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { mutationSchema } from '@/lib/validation/mutations'
import { executeMutation } from '@/server/mutations/vault.mutations'
import type { ActionResult } from '@/types/domain'

const loginSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(256),
  next: z.string().optional(),
})

export async function mutate(input: unknown): Promise<ActionResult> {
  try {
    const result = await executeMutation(input)
    const mutation = mutationSchema.parse(input)
    revalidatePath('/')
    revalidatePath('/library')
    revalidatePath('/activity')
    revalidatePath('/movie/[slug]', 'page')
    if (
      mutation.type === 'add' ||
      mutation.type === 'remove' ||
      mutation.type === 'watch' ||
      mutation.type === 'refresh_metadata'
    ) {
      revalidatePath('/actors')
      revalidatePath('/directors')
      revalidatePath('/genres')
      revalidatePath('/people/[slug]', 'page')
    }
    if (
      mutation.type === 'collection' ||
      mutation.type === 'membership' ||
      mutation.type === 'add' ||
      mutation.type === 'remove'
    ) {
      revalidatePath('/collections')
      revalidatePath('/collections/[slug]', 'page')
    }
    return { ok: true, ...result }
  } catch (error) {
    const safe = publicError(error)
    return { ok: false, code: safe.code, message: safe.message }
  }
}

export async function login(formData: FormData): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    next: formData.get('next') ?? undefined,
  })
  if (!parsed.success)
    return {
      ok: false,
      code: 'INVALID_INPUT',
      message: 'Enter a valid email and password.',
    }
  try {
    const client = await createSupabaseServerClient()
    const { error } = await client.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    })
    if (error)
      return {
        ok: false,
        code: 'INVALID_CREDENTIALS',
        message: 'The email or password could not be verified.',
      }
    try {
      await requireEditor()
    } catch {
      await client.auth.signOut()
      return {
        ok: false,
        code: 'FORBIDDEN',
        message: 'This account is not an approved Movie Vault member.',
      }
    }
    revalidatePath('/', 'layout')
    const redirectTo = safeReturnPath(parsed.data.next)
    return { ok: true, message: 'Welcome back.', redirectTo }
  } catch (error) {
    const safe = publicError(error)
    return { ok: false, code: safe.code, message: safe.message }
  }
}

export async function logout(): Promise<ActionResult> {
  try {
    const client = await createSupabaseServerClient()
    const { error } = await client.auth.signOut()
    if (error)
      return {
        ok: false,
        code: 'LOGOUT_FAILED',
        message: 'Could not sign out. Please try again.',
      }
    revalidatePath('/', 'layout')
    return { ok: true, message: 'Signed out.', redirectTo: '/' }
  } catch (error) {
    const safe = publicError(error)
    return { ok: false, code: safe.code, message: safe.message }
  }
}
