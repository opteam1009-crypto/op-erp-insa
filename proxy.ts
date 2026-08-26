import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { isPublicPath, isAdminOnlyPath } from '@/lib/auth/route-guard'

/**
 * Copies any auth cookies Supabase wrote onto `source` (via setAll) over to a redirect
 * response. Returning a freshly-constructed NextResponse.redirect() without doing this
 * silently discards a just-refreshed session token.
 */
function redirectTo(path: string, request: NextRequest, source: NextResponse) {
  const redirectResponse = NextResponse.redirect(new URL(path, request.url))
  source.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie))
  return redirectResponse
}

export async function proxy(request: NextRequest) {
  const response = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // `options` carries maxAge/sameSite/path/secure — dropping it downgrades the
          // refreshed auth cookie to a browser-session cookie (logout on browser restart).
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  if (!user && !isPublicPath(pathname)) {
    return redirectTo('/login', request, response)
  }

  if (user && isAdminOnlyPath(pathname)) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return redirectTo('/employees', request, response)
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
