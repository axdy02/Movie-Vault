import 'server-only'
import { cache } from 'react'
import {
  createSupabaseServerClient,
  isSupabaseConfigured,
} from '@/lib/supabase/server'
import type { EditorProfile } from '@/types/domain'
import { ForbiddenError, UnauthorizedError } from './errors'

export const getEditor = cache(async (): Promise<EditorProfile | null> => {
  if (!isSupabaseConfigured()) return null
  try {
    const client = await createSupabaseServerClient()
    const {
      data: { user },
      error,
    } = await client.auth.getUser()
    if (error || !user) return null
    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('id,display_name,avatar_url,role,is_active')
      .eq('id', user.id)
      .maybeSingle()
    if (
      profileError ||
      !profile ||
      !profile.is_active ||
      profile.role !== 'editor'
    )
      return null
    return {
      id: profile.id,
      displayName: profile.display_name,
      avatarUrl: profile.avatar_url,
    }
  } catch {
    return null
  }
})

export async function requireEditor() {
  const client = await createSupabaseServerClient()
  const {
    data: { user },
    error,
  } = await client.auth.getUser()
  if (error || !user) throw new UnauthorizedError()
  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('id,display_name,avatar_url,role,is_active')
    .eq('id', user.id)
    .maybeSingle()
  if (
    profileError ||
    !profile ||
    !profile.is_active ||
    profile.role !== 'editor'
  )
    throw new ForbiddenError()
  return {
    client,
    editor: {
      id: profile.id,
      displayName: profile.display_name,
      avatarUrl: profile.avatar_url,
    } satisfies EditorProfile,
  }
}
