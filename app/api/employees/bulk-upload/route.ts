import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { parseEmployeeExcel } from '@/lib/excel/employee-parser'
import { employeeSchema } from '@/lib/validation/employee'
import { permissions } from '@/lib/auth/permissions'
import type { Role } from '@/lib/types'

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', auth.user.id).single()
  if (!profile || !permissions.canManageEmployees(profile.role as Role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'no file' }, { status: 400 })

  const buffer = await file.arrayBuffer()
  const { rows, errors } = parseEmployeeExcel(buffer)

  const { data: departments } = await supabase.from('departments').select('id, name')
  const departmentByName = new Map((departments ?? []).map((d) => [d.name, d.id]))

  const inserted: string[] = []
  const rowErrors = [...errors]

  for (const [index, row] of rows.entries()) {
    const departmentName = row.department.trim()
    if (departmentName && !departmentByName.has(departmentName)) {
      rowErrors.push({ row: index + 2, message: `알 수 없는 부서명: "${row.department}"` })
      continue
    }

    const parsed = employeeSchema.safeParse({
      employee_number: row.employee_number,
      name: row.name,
      department_id: departmentByName.get(departmentName) ?? null,
      position: row.position,
      employment_type: row.employment_type,
      hire_date: row.hire_date,
      birth_date: row.birth_date,
      phone: row.phone,
      emergency_contact: row.emergency_contact,
      contract_review_date: '',
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
      contract_review_date: parsed.data.contract_review_date || null,
      contract_announce_date: parsed.data.contract_announce_date || null,
      created_by: auth.user.id,
    })
    if (error) {
      rowErrors.push({ row: index + 2, message: error.message })
    } else {
      inserted.push(row.employee_number)
    }
  }

  return NextResponse.json({ inserted: inserted.length, errors: rowErrors })
}
