import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { permissions } from '@/lib/auth/permissions'
import type { Role } from '@/lib/types'

export default async function PayrollPage() {
  const supabase = await createServerSupabase()
  const { data: auth } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', auth.user!.id).single()

  if (!profile || !permissions.canViewPayroll(profile.role as Role)) {
    redirect('/employees')
  }

  const { data: employees } = await supabase.from('employees').select('id, employee_number, name').order('employee_number')

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">급여대장 조회</h1>
      <ul className="space-y-2">
        {employees?.map((emp) => (
          <li key={emp.id}>
            <Link href={`/payroll/${emp.id}/upload`} className="text-blue-600">
              {emp.employee_number} {emp.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
