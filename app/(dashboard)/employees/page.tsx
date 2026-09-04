import Link from 'next/link'
import { sql } from '@/lib/db/sql'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Table, THead, TBody, TR, TH, TD, TableEmpty } from '@/components/ui/Table'
import { Alert } from '@/components/ui/Alert'
import { buttonClass } from '@/lib/ui/button-class'
import { NewEmployeeModalButton } from './NewEmployeeModalButton'

interface EmployeeRow {
  id: string
  employee_number: string
  name: string
  employment_type: string
  status: string
  department_name: string | null
}

interface DepartmentRow {
  id: string
  name: string
}

export default async function EmployeesPage() {
  let employees: EmployeeRow[]
  let departments: DepartmentRow[]

  try {
    // 부서 목록은 등록 모달의 셀렉트 옵션이다.
    const [employeeRows, departmentRows] = await Promise.all([
      sql`
        select e.id, e.employee_number, e.name, e.employment_type, e.status,
               d.name as department_name
        from employees e
        left join departments d on d.id = e.department_id
        order by e.employee_number
      `,
      sql`select id, name from departments order by name`,
    ])
    employees = employeeRows as EmployeeRow[]
    departments = departmentRows as DepartmentRow[]
  } catch (error) {
    // 조회 실패를 빈 목록으로 흘려보내면 "등록된 사원이 없습니다"라는 빈 상태가
    // 떠서, 데이터가 없는 것과 못 불러온 것을 구분할 수 없게 된다.
    console.error('Failed to load employees:', error)
    return <Alert variant="error">사원 목록을 불러오지 못했습니다. 관리자에게 문의하세요.</Alert>
  }

  return (
    <div>
      <PageHeader
        title="사원 관리"
        description={`총 ${employees.length}명`}
        actions={
          <>
            <Link href="/employees/bulk-upload" className={buttonClass('secondary')}>
              엑셀 일괄 등록
            </Link>
            <NewEmployeeModalButton departments={departments} />
          </>
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
          {employees.length ? (
            employees.map((emp) => (
              <TR key={emp.id}>
                <TD className="tnum">
                  <Link
                    href={`/employees/${emp.id}`}
                    className="font-medium text-accent hover:underline"
                  >
                    {emp.employee_number}
                  </Link>
                </TD>
                <TD>{emp.name}</TD>
                <TD>{emp.department_name ?? '-'}</TD>
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
              description="사원 등록 또는 엑셀 일괄 등록으로 시작하세요."
            />
          )}
        </TBody>
      </Table>
    </div>
  )
}
