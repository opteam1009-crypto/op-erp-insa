import Link from 'next/link'
import { createServerSupabase } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/current-user'
import { permissions } from '@/lib/auth/permissions'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Table, THead, TBody, TR, TH, TD, TableEmpty } from '@/components/ui/Table'
import { buttonClass } from '@/lib/ui/button-class'

export default async function EmployeesPage() {
  const user = await requireUser()
  const canManage = permissions.canManageEmployees(user.role)

  const supabase = await createServerSupabase()

  const { data: employees } = await supabase
    .from('employees')
    .select('id, employee_number, name, employment_type, status, department_id, departments(name)')
    .order('employee_number')

  return (
    <div>
      <PageHeader
        title="사원 관리"
        description={`총 ${employees?.length ?? 0}명`}
        actions={
          canManage && (
            <>
              <Link href="/employees/bulk-upload" className={buttonClass('secondary')}>
                엑셀 일괄 등록
              </Link>
              <Link href="/employees/new" className={buttonClass('primary')}>
                + 사원 등록
              </Link>
            </>
          )
        }
      />
      <Table>
        <THead>
          <TR>
            <TH>사번</TH>
            <TH>이름</TH>
            <TH>부서</TH>
            <TH>근로형태</TH>
            <TH>재직상태</TH>
          </TR>
        </THead>
        <TBody>
          {employees?.length ? (
            employees.map((emp) => (
              <TR key={emp.id}>
                <TD className="tnum">
                  <Link href={`/employees/${emp.id}`} className="font-medium text-accent hover:underline">
                    {emp.employee_number}
                  </Link>
                </TD>
                <TD>{emp.name}</TD>
                <TD>{(emp.departments as unknown as { name: string } | null)?.name ?? '-'}</TD>
                <TD>{emp.employment_type}</TD>
                <TD>
                  <Badge status={emp.status}>{emp.status}</Badge>
                </TD>
              </TR>
            ))
          ) : (
            <TableEmpty
              colSpan={5}
              title="등록된 사원이 없습니다"
              description={canManage ? '사원 등록 또는 엑셀 일괄 등록으로 시작하세요.' : undefined}
            />
          )}
        </TBody>
      </Table>
    </div>
  )
}
