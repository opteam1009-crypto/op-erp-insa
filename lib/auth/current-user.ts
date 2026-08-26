import { redirect } from 'next/navigation'
import { cache } from 'react'
import { createServerSupabase } from '@/lib/supabase/server'
import type { Role } from '@/lib/types'

export interface CurrentUser {
  userId: string
  email: string
  role: Role
}

const ROLES: readonly Role[] = ['admin', 'staff', 'viewer']

/** Narrows an unvalidated DB value to Role so the cast lives in exactly one place. */
export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value)
}

/**
 * Resolves the signed-in user and their role in one place.
 *
 * Wrapped in React.cache() so that multiple callers within the same request (e.g. the
 * dashboard layout AND the page it renders) collapse into a single Supabase round-trip.
 *
 * Returns null when there is no session, or no profile row for the session user.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createServerSupabase()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, email')
    .eq('id', auth.user.id)
    .single()

  if (!profile) return null

  // Fail loudly on an unexpected/corrupted role instead of silently type-asserting it.
  if (!isRole(profile.role)) {
    throw new Error(`Unexpected profiles.role value for user ${auth.user.id}: ${String(profile.role)}`)
  }

  return {
    userId: auth.user.id,
    email: (profile.email as string | null) ?? auth.user.email ?? '',
    role: profile.role,
  }
})

/**
 * Server-component/page variant: redirects to /login instead of returning null.
 * Route handlers must NOT use this (they need a 401 JSON body) — call getCurrentUser() there.
 */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  return user
}
