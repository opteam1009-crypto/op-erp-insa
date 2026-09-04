import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { parseEmployeeExcel } from '@/lib/excel/employee-parser'
import { employeeSchema } from '@/lib/validation/employee'
import { getCurrentUser } from '@/lib/auth/current-user'
import { permissions } from '@/lib/auth/permissions'
import { calculateContractReviewDate } from '@/lib/scheduling/contract-dates'

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!permissions.canManageEmployees(user.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const supabase = await createServerSupabase()

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'no file' }, { status: 400 })

  const buffer = await file.arrayBuffer()
  const { rows, errors } = parseEmployeeExcel(buffer)

  const { data: departments } = await supabase.from('departments').select('id, name')
  const departmentByName = new Map((departments ?? []).map((d) => [d.name, d.id]))

  // 사번이 비어 있는 행에 붙일 번호. 대장에 사번 열이 아예 없는 경우가 흔한데
  // employee_number는 NOT NULL UNIQUE라 비워 둘 수 없다. 기존 사번 중 숫자로
  // 읽히는 것들의 최댓값 다음부터 4자리로 채운다. 사람이 나중에 바꿀 수 있다.
  const { data: existing } = await supabase.from('employees').select('employee_number')
  let nextNumber =
    Math.max(
      0,
      ...(existing ?? [])
        .map((e) => Number(e.employee_number))
        .filter((n) => Number.isFinite(n))
    ) + 1

  const inserted: string[] = []
  const rowErrors = [...errors]

  for (const [index, row] of rows.entries()) {
    const departmentName = row.department.trim()
    if (departmentName && !departmentByName.has(departmentName)) {
      rowErrors.push({ row: index + 2, message: `알 수 없는 부서명: "${row.department}"` })
      continue
    }

    const employeeNumber = row.employee_number || String(nextNumber++).padStart(4, '0')

    const parsed = employeeSchema.safeParse({
      employee_number: employeeNumber,
      name: row.name,
      department_id: departmentByName.get(departmentName) ?? null,
      position: row.position,
      employment_type: row.employment_type,
      hire_date: row.hire_date,
      birth_date: row.birth_date,
      phone: row.phone,
      emergency_contact: row.emergency_contact,
      contract_announce_date: '',
    })

    if (!parsed.success) {
      rowErrors.push({ row: index + 2, message: parsed.error.issues.map((i) => i.message).join(', ') })
      continue
    }

    const { error } = await supabase.from('employees').insert({
      ...parsed.data,
      department_id: parsed.data.department_id || null,
      birth_date: parsed.data.birth_date || null,
      // 파서가 정규화한 값. 넘기지 않으면 DB 기본값 '재직'이 붙어 퇴사자가
      // 재직중으로 들어간다.
      status: row.status,
      resignation_date: row.resignation_date || null,
      contract_review_date: calculateContractReviewDate(parsed.data.hire_date),
      contract_announce_date: parsed.data.contract_announce_date || null,
      created_by: user.userId,
    })
    if (error) {
      rowErrors.push({ row: index + 2, message: error.message })
    } else {
      inserted.push(employeeNumber)
    }
  }

  return NextResponse.json({ inserted: inserted.length, errors: rowErrors })
}
