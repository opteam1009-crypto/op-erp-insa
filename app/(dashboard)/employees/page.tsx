import Link from 'next/link'
import { createServerSupabase } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/current-user'
import { permissions } from '@/lib/auth/permissions'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Table, THead, TBody, TR, TH, TD, TableEmpty } from '@/components/ui/Table'
import { Alert } from '@/components/ui/Alert'
import { buttonClass } from '@/lib/ui/button-class'
import { NewEmployeeModalButton } from './NewEmployeeModalButton'

export default async function EmployeesPage() {
  const user = await requireUser()
  const canManage = permissions.canManageEmployees(user.role)

  const supabase = await createServerSupabase()

  // 부서 목록은 등록 모달의 셀렉트 옵션이다. 관리 권한이 없으면 모달 버튼
  // 자체가 렌더링되지 않으므로 조회하지 않는다.
  const [{ data: employees, error: employeesError }, departmentsResult] = await Promise.all([
    supabase
      .from('employees')
      .select('id, employee_number, name, employment_type, status, department_id, departments(name)')
      .order('employee_number'),
    canManage
      ? supabase.from('departments').select('id, name').order('name')
      : Promise.resolve({ data: [], error: null }),
  ])

  // 조회 실패를 빈 목록으로 흘려보내면 "등록된 사원이 없습니다"라는 빈 상태가
  // 떠서, 데이터가 없는 것과 못 불러온 것을 구분할 수 없게 된다.
  if (employeesError) {
    console.error('Failed to load employees:', employeesError)
    return <Alert variant="error">사원 목록을 불러오지 못했습니다. 관리자에게 문의하세요.</Alert>
  }

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
              <NewEmployeeModalButton departments={departmentsResult.data ?? []} />
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
