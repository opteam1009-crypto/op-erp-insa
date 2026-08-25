import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, name, email')
    .eq('id', user.id)
    .single()

  return (
    <div>
      <header className="flex items-center justify-between border-b p-4">
        <span className="font-semibold">회사 ERP</span>
        <span className="text-sm text-gray-500">{profile?.email} ({profile?.role})</span>
      </header>
      <main className="p-6">{children}</main>
    </div>
  )
}
