import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/current-user'
import { permissions } from '@/lib/auth/permissions'
import { PageHeader } from '@/components/ui/PageHeader'
import { Table, THead, TBody, TR, TH, TD, TableEmpty } from '@/components/ui/Table'
import { buttonClass } from '@/lib/ui/button-class'

export default async function PayrollPage() {
  const user = await requireUser()

  if (!permissions.canViewPayroll(user.role)) {
    redirect('/employees')
  }

  const supabase = await createServerSupabase()
  const { data: employees } = await supabase.from('employees').select('id, employee_number, name').order('employee_number')

  return (
    <div className="max-w-3xl">
      <PageHeader title="급여대장 조회" description="사원을 선택해 급여대장을 올리거나 확인하세요." />
      <Table>
        <THead>
          <TR>
            <TH>사번</TH>
            <TH>이름</TH>
            <TH align="right">급여대장</TH>
          </TR>
        </THead>
        <TBody>
          {employees?.length ? (
            employees.map((emp) => (
              <TR key={emp.id}>
                <TD className="tnum">{emp.employee_number}</TD>
                <TD>{emp.name}</TD>
                <TD align="right">
                  <Link href={`/payroll/${emp.id}/upload`} className={buttonClass('secondary', 'sm')}>
                    열기
                  </Link>
                </TD>
              </TR>
            ))
          ) : (
            <TableEmpty colSpan={3} title="등록된 사원이 없습니다" />
          )}
        </TBody>
      </Table>
    </div>
  )
}
