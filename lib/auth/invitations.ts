import type { SupabaseClient } from '@supabase/supabase-js'

export interface AcceptResult {
  accepted: boolean
  reason?: 'not_invited'
}

export async function acceptInvitation(supabase: SupabaseClient): Promise<AcceptResult> {
  const { data, error } = await supabase.rpc('accept_invitation')

  if (error) {
    throw error
  }

  if (!data) {
    return { accepted: false, reason: 'not_invited' }
  }

  return { accepted: true }
}
