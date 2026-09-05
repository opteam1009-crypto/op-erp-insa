import { NextResponse, type NextRequest } from 'next/server'
import { sql } from '@/lib/db/sql'
import { parseEmployeeExcel } from '@/lib/excel/employee-parser'
import { employeeSchema } from '@/lib/validation/employee'
import { isSignedIn } from '@/lib/auth/current-user'
import { calculateContractReviewDate, calculateContractEndDate } from '@/lib/scheduling/contract-dates'

export async function POST(request: NextRequest) {
  if (!(await isSignedIn())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'no file' }, { status: 400 })

  const buffer = await file.arrayBuffer()
  const { rows, errors } = parseEmployeeExcel(buffer)

  const departments = (await sql`select id, name from departments`) as {
    id: string
    name: string
  }[]
  const departmentByName = new Map(departments.map((d) => [d.name, d.id]))

  // 사번이 비어 있는 행에 붙일 번호. 대장에 사번 열이 아예 없는 경우가 흔한데
  // employee_number는 NOT NULL UNIQUE라 비워 둘 수 없다. 기존 사번 중 숫자로
  // 읽히는 것들의 최댓값 다음부터 4자리로 채운다. 사람이 나중에 바꿀 수 있다.
  const existing = (await sql`select employee_number from employees`) as {
    employee_number: string
  }[]
  let nextNumber =
    Math.max(
      0,
      ...existing.map((e) => Number(e.employee_number)).filter((n) => Number.isFinite(n))
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

    const d = parsed.data

    try {
      await sql`
        insert into employees (
          employee_number, name, department_id, position, employment_type,
          hire_date, birth_date, phone, emergency_contact,
          status, resignation_date, contract_review_date, contract_end_date
        ) values (
          ${d.employee_number}, ${d.name}, ${d.department_id || null}, ${d.position ?? ''},
          ${d.employment_type}, ${d.hire_date}, ${d.birth_date || null}, ${d.phone ?? ''},
          ${d.emergency_contact ?? ''},
          -- 파서가 정규화한 값. 넘기지 않으면 기본값 '재직'이 붙어 퇴사자가
          -- 재직중으로 들어간다.
          ${row.status}, ${row.resignation_date || null},
          ${calculateContractReviewDate(d.hire_date)},
          ${calculateContractEndDate(d.hire_date)}
        )
      `
      inserted.push(employeeNumber)
    } catch (error) {
      rowErrors.push({
        row: index + 2,
        message: error instanceof Error ? error.message : '저장 실패',
      })
    }
  }

  return NextResponse.json({ inserted: inserted.length, errors: rowErrors })
}
