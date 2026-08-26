import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/current-user'
import { permissions } from '@/lib/auth/permissions'

export default async function PayrollPage() {
  const user = await requireUser()

  if (!permissions.canViewPayroll(user.role)) {
    redirect('/employees')
  }

  const supabase = await createServerSupabase()
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
