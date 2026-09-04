import { NextResponse } from 'next/server'
import { sql } from '@/lib/db/sql'
import { buildEmployeeWorkbook, type EmployeeExportRow } from '@/lib/excel/employee-export'
import { isSignedIn } from '@/lib/auth/current-user'

export async function GET() {
  if (!(await isSignedIn())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  // 부서명까지 함께 읽는다 — 내보낸 파일을 그대로 되올릴 수 있어야 하고,
  // 가져오기는 부서를 이름으로 찾는다.
  const rows = (await sql`
    select e.*, d.name as department_name
    from employees e
    left join departments d on d.id = e.department_id
    order by e.employee_number
  `) as (EmployeeExportRow & { department_name: string | null })[]

  const employees: EmployeeExportRow[] = rows.map((row) => ({
    ...row,
    departments: row.department_name ? { name: row.department_name } : null,
  }))

  const buffer = buildEmployeeWorkbook(employees)

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="employees.xlsx"',
    },
  })
}
