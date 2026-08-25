'use client'

import { createBrowserSupabase } from '@/lib/supabase/client'

export default function LoginPage() {
  const supabase = createBrowserSupabase()

  const signIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <button
        onClick={signIn}
        className="rounded-md bg-black px-6 py-3 text-white"
      >
        Google로 로그인
      </button>
    </div>
  )
}
