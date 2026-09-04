import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { buildEmployeeWorkbook, type EmployeeExportRow } from '@/lib/excel/employee-export'
import { getCurrentUser } from '@/lib/auth/current-user'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const supabase = await createServerSupabase()
  // 부서명까지 함께 읽는다 — 내보낸 파일을 그대로 되올릴 수 있어야 하고,
  // 가져오기는 부서를 이름으로 찾는다.
  const { data: employees } = await supabase
    .from('employees')
    .select('*, departments(name)')
    .order('employee_number')

  const buffer = buildEmployeeWorkbook((employees ?? []) as unknown as EmployeeExportRow[])

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="employees.xlsx"',
    },
  })
}
