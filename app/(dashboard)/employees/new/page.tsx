import { sql } from '@/lib/db/sql'
import { PageHeader } from '@/components/ui/PageHeader'
import { NewEmployeeForm, type DepartmentOption } from './NewEmployeeForm'

export default async function NewEmployeePage() {
  const departments = (await sql`select id, name from departments order by name`) as DepartmentOption[]

  // 제목은 폼이 아니라 여기서 그린다 — 같은 폼이 모달에서도 쓰이고,
  // 거기서는 모달 제목이 그 역할을 한다.
  return (
    <div className="max-w-3xl">
      <PageHeader title="사원 등록" />
      <NewEmployeeForm departments={departments} />
    </div>
  )
}
