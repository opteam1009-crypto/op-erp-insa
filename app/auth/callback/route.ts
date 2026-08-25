import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { acceptInvitation } from '@/lib/auth/invitations'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const supabase = await createServerSupabase()

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error || !data.user) {
      return NextResponse.redirect(
        new URL('/login?error=auth_failed', request.url)
      )
    }

    try {
      const result = await acceptInvitation(supabase)

      if (!result.accepted) {
        await supabase.auth.signOut()
        return NextResponse.redirect(
          new URL('/login?error=not_invited', request.url)
        )
      }
    } catch {
      await supabase.auth.signOut()
      return NextResponse.redirect(
        new URL('/login?error=not_invited', request.url)
      )
    }
  }

  return NextResponse.redirect(new URL('/employees', request.url))
}
