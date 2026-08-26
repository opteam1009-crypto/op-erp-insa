import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/current-user'

export default async function Home() {
  // Redirects to /login when there is no session; otherwise straight into the app.
  await requireUser()
  redirect('/employees')
}
