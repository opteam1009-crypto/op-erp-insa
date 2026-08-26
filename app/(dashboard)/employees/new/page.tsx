import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/current-user'
import { permissions } from '@/lib/auth/permissions'
import { NewEmployeeForm } from './NewEmployeeForm'

export default async function NewEmployeePage() {
  const user = await requireUser()

  if (!permissions.canManageEmployees(user.role)) {
    redirect('/employees')
  }

  const supabase = await createServerSupabase()
  const { data: departments } = await supabase.from('departments').select('id, name').order('name')

  return <NewEmployeeForm departments={departments ?? []} />
}
