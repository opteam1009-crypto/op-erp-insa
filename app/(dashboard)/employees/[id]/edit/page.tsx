import { redirect, notFound } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/current-user'
import { permissions } from '@/lib/auth/permissions'
import { EditEmployeeForm } from '../EditEmployeeForm'
import type { Employee } from '@/lib/types'

export default async function EditEmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireUser()
  if (!permissions.canManageEmployees(user.role)) {
    redirect(`/employees/${id}`)
  }

  const supabase = await createServerSupabase()
  const [{ data: employee }, { data: departments }] = await Promise.all([
    supabase.from('employees').select('*').eq('id', id).single(),
    supabase.from('departments').select('id, name').order('name'),
  ])

  if (!employee) notFound()

  return <EditEmployeeForm employee={employee as Employee} departments={departments ?? []} />
}
