import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SESSION_COOKIE, verifySession } from './session'

/**
 * 로그인 여부만 확인한다. 돌려줄 신원이 없다 — 인증이 공용 비밀번호 하나이므로
 * 쿠키의 존재가 "비밀번호를 알고 있다"는 유일한 사실이고, 그 이상 구분할 대상이
 * 없다.
 *
 * 실질적인 차단은 proxy.ts가 요청 단위로 한다. 이 함수는 미들웨어를 우회한
 * 호출(예: 서버 액션 직접 호출)에 대한 두 번째 검사다.
 */
export async function isSignedIn(): Promise<boolean> {
  const store = await cookies()
  return verifySession(store.get(SESSION_COOKIE)?.value, process.env.SESSION_SECRET ?? '')
}

/** 서버 컴포넌트/페이지용. 로그인하지 않았으면 /login으로 보낸다. */
export async function requireSession(): Promise<void> {
  if (!(await isSignedIn())) redirect('/login')
}
