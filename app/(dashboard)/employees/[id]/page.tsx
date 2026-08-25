import { createServerSupabase } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabase()
  const { data: employee } = await supabase.from('employees').select('*').eq('id', id).single()

  if (!employee) notFound()

  return (
    <div className="max-w-lg space-y-2">
      <h1 className="text-xl font-bold">{employee.name}</h1>
      <p>사번: {employee.employee_number}</p>
      <p>직급: {employee.position ?? '-'}</p>
      <p>근로형태: {employee.employment_type}</p>
      <p>재직상태: {employee.status}</p>
      <p>입사일: {employee.hire_date}</p>
      <p>연락처: {employee.phone ?? '-'}</p>
      <p>비상연락망: {employee.emergency_contact ?? '-'}</p>
      <p>정규직전환 평가일: {employee.contract_review_date ?? '-'}</p>
      <p>정규직전환 발표일: {employee.contract_announce_date ?? '-'}</p>
    </div>
  )
}
