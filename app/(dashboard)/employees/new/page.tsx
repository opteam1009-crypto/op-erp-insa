import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/current-user'
import { permissions } from '@/lib/auth/permissions'
import { PageHeader } from '@/components/ui/PageHeader'
import { NewEmployeeForm } from './NewEmployeeForm'

export default async function NewEmployeePage() {
  const user = await requireUser()

  if (!permissions.canManageEmployees(user.role)) {
    redirect('/employees')
  }

  const supabase = await createServerSupabase()
  const { data: departments } = await supabase.from('departments').select('id, name').order('name')

  // 제목은 폼이 아니라 여기서 그린다 — 같은 폼이 모달에서도 쓰이고,
  // 거기서는 모달 제목이 그 역할을 한다.
  return (
    <div className="max-w-3xl">
      <PageHeader title="사원 등록" />
      <NewEmployeeForm departments={departments ?? []} />
    </div>
  )
}
