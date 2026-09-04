import { redirect } from 'next/navigation'
import { requireSession } from '@/lib/auth/current-user'

export default async function Home() {
  // 세션이 없으면 /login으로, 있으면 곧장 앱으로.
  await requireSession()
  redirect('/employees')
}
