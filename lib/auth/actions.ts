'use server'

import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'

/**
 * 세션을 파기하고 로그인 화면으로 보낸다.
 *
 * 사이드바 하단의 <form action={signOut}>에서 호출한다. 서버 액션이므로
 * 클라이언트 컴포넌트가 직접 import해도 함수 본문이 번들에 들어가지 않는다.
 */
export async function signOut(): Promise<void> {
  const supabase = await createServerSupabase()
  await supabase.auth.signOut()
  redirect('/login')
}
