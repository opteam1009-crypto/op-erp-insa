import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE, verifySession } from '@/lib/auth/session'

/**
 * 인가는 여기 한 곳이다.
 *
 * Supabase 시절에는 앱이 권한을 검사하고 RLS가 DB에서 한 번 더 막았다. Neon에는
 * 앱 role 하나로 붙으므로 DB가 걸러 주는 것이 없다 — 이 검사를 통과하지 않는
 * 경로를 만들면 그대로 열린다. 새 라우트를 추가할 때 matcher에서 빠지지 않는지
 * 확인할 것.
 */
const PUBLIC_PATHS = ['/login']

const CRON_PREFIX = '/api/cron/'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 크론 라우트는 사람이 아니라 Vercel Cron이 부른다. 세션 쿠키가 없고, 대신
  // 각 라우트가 Authorization 헤더의 CRON_SECRET을 직접 검증한다.
  if (pathname.startsWith(CRON_PREFIX)) return NextResponse.next()

  const authenticated = verifySession(
    request.cookies.get(SESSION_COOKIE)?.value,
    process.env.SESSION_SECRET ?? ''
  )

  if (!authenticated && !PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 이미 로그인한 사람이 /login을 열면 목록으로 보낸다.
  if (authenticated && pathname === '/login') {
    return NextResponse.redirect(new URL('/employees', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
