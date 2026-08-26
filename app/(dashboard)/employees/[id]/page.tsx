import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/current-user'
import { permissions } from '@/lib/auth/permissions'

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireUser()
  const supabase = await createServerSupabase()
  const { data: employee } = await supabase.from('employees').select('*').eq('id', id).single()

  if (!employee) notFound()

  return (
    <div className="max-w-lg space-y-2">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{employee.name}</h1>
        {permissions.canManageEmployees(user.role) && (
          <Link href={`/employees/${id}/edit`} className="rounded border px-3 py-1 text-sm">
            수정
          </Link>
        )}
      </div>
      <p>사번: {employee.employee_number}</p>
      <p>직급: {employee.position ?? '-'}</p>
      <p>근로형태: {employee.employment_type}</p>
      <p>재직상태: {employee.status}</p>
      <p>입사일: {employee.hire_date}</p>
      <p>연락처: {employee.phone ?? '-'}</p>
      <p>비상연락망: {employee.emergency_contact ?? '-'}</p>
      <p>정규직전환 평가일: {employee.contract_review_date ?? '-'}</p>
      <p>정규직전환 발표일: {employee.contract_announce_date ?? '-'}</p>
      <p>연봉협상 평가일: {employee.salary_review_date ?? '-'}</p>
      <p>연봉협상 발표일: {employee.salary_announce_date ?? '-'}</p>
    </div>
  )
}
