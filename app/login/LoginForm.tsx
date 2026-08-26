'use client'

import { useSearchParams } from 'next/navigation'
import { createBrowserSupabase } from '@/lib/supabase/client'

const ERROR_MESSAGES: Record<string, string> = {
  not_invited: '초대받지 않은 계정입니다. 관리자에게 문의해주세요.',
  auth_failed: '로그인에 실패했습니다. 다시 시도해주세요.',
}

export function LoginForm() {
  const searchParams = useSearchParams()
  const errorCode = searchParams.get('error')
  const errorMessage = errorCode ? ERROR_MESSAGES[errorCode] ?? ERROR_MESSAGES.auth_failed : null

  const signIn = async () => {
    // Created inside the handler, not at render time: /login is prerendered at build,
    // and constructing the browser client with empty NEXT_PUBLIC_SUPABASE_* env vars
    // throws, which would fail `next build` on any preview/CI build without real vars.
    const supabase = createBrowserSupabase()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {errorMessage && (
        <p role="alert" className="rounded border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">
          {errorMessage}
        </p>
      )}
      <button
        onClick={signIn}
        className="rounded-md bg-black px-6 py-3 text-white"
      >
        Google로 로그인
      </button>
    </div>
  )
}
