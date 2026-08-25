import type { SupabaseClient } from '@supabase/supabase-js'

export interface AcceptResult {
  accepted: boolean
  reason?: 'not_invited' | 'already_accepted_elsewhere'
}

export async function acceptInvitation(
  supabase: SupabaseClient,
  userId: string,
  email: string
): Promise<AcceptResult> {
  const { data: invitation } = await supabase
    .from('invitations')
    .select('id, role, status')
    .eq('email', email)
    .maybeSingle()

  if (!invitation) {
    return { accepted: false, reason: 'not_invited' }
  }

  await supabase.from('profiles').upsert({
    id: userId,
    email,
    role: invitation.role,
  })

  await supabase
    .from('invitations')
    .update({ status: 'accepted' })
    .eq('id', invitation.id)

  return { accepted: true }
}
