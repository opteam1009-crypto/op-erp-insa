'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SESSION_COOKIE, SESSION_MAX_AGE_MS, passwordMatches, signSession } from './session'

export interface SignInResult {
  error: string
}

/**
 * 공용 비밀번호 하나를 확인하고 서명된 세션 쿠키를 심는다.
 *
 * 실패해도 "비밀번호가 틀렸습니다" 한 가지 메시지만 돌려준다 — 구분할 계정이
 * 없으므로 더 알려 줄 것도 없다.
 */
export async function signIn(_prev: SignInResult | null, formData: FormData): Promise<SignInResult> {
  const secret = process.env.SESSION_SECRET
  if (!secret) {
    console.error('SESSION_SECRET is not set; refusing to issue a session.')
    return { error: '서버 설정이 완료되지 않았습니다. 관리자에게 문의하세요.' }
  }

  const supplied = String(formData.get('password') ?? '')
  if (!passwordMatches(process.env.APP_PASSWORD, supplied)) {
    return { error: '비밀번호가 올바르지 않습니다.' }
  }

  const store = await cookies()
  store.set(SESSION_COOKIE, signSession(secret), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE_MS / 1000,
  })

  redirect('/employees')
}

export async function signOut(): Promise<void> {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
  redirect('/login')
}
