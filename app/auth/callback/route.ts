import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { acceptInvitation } from '@/lib/auth/invitations'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const supabase = await createServerSupabase()

  if (code) {
    const { data } = await supabase.auth.exchangeCodeForSession(code)
    const user = data.user

    if (user?.email) {
      const result = await acceptInvitation(supabase, user.id, user.email)

      if (!result.accepted) {
        await supabase.auth.signOut()
        return NextResponse.redirect(
          new URL('/login?error=not_invited', request.url)
        )
      }
    }
  }

  return NextResponse.redirect(new URL('/employees', request.url))
}
