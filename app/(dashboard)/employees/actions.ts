'use server'

import { revalidatePath } from 'next/cache'
import { sql } from '@/lib/db/sql'
import { employeeSchema, type EmployeeInput } from '@/lib/validation/employee'
import { isSignedIn } from '@/lib/auth/current-user'
import { calculateContractReviewDate } from '@/lib/scheduling/contract-dates'

/** 빈 문자열은 날짜 컬럼에 넣을 수 없다. NULL로 바꾼다. */
function orNull(value: string | null | undefined): string | null {
  return value ? value : null
}

export async function createEmployee(input: EmployeeInput) {
  // 서버 액션은 직접 호출 가능한 엔드포인트라 proxy.ts를 우회한다. 세션 검사가
  // 여기에도 있어야 한다.
  if (!(await isSignedIn())) return { error: '로그인이 필요합니다' }

  const parsed = employeeSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(', ') }
  }

  const d = parsed.data

  try {
    await sql`
      insert into employees (
        employee_number, name, department_id, position, employment_type,
        hire_date, birth_date, phone, emergency_contact,
        contract_review_date, contract_announce_date,
        salary_review_date, salary_announce_date
      ) values (
        ${d.employee_number}, ${d.name}, ${orNull(d.department_id)}, ${d.position ?? ''},
        ${d.employment_type}, ${d.hire_date}, ${orNull(d.birth_date)}, ${d.phone ?? ''},
        ${d.emergency_contact ?? ''},
        -- 등록 시점에 항상 계산한다. 클라이언트 입력을 받지 않는다.
        ${calculateContractReviewDate(d.hire_date)},
        ${orNull(d.contract_announce_date)},
        ${orNull(d.salary_review_date)}, ${orNull(d.salary_announce_date)}
      )
    `
  } catch (error) {
    return { error: error instanceof Error ? error.message : '저장에 실패했습니다' }
  }

  revalidatePath('/employees')
  return { error: null }
}

export async function updateEmployee(id: string, input: EmployeeInput) {
  if (!(await isSignedIn())) return { error: '로그인이 필요합니다' }

  const parsed = employeeSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(', ') }
  }

  const d = parsed.data

  try {
    await sql`
      update employees set
        employee_number = ${d.employee_number},
        name = ${d.name},
        department_id = ${orNull(d.department_id)},
        position = ${d.position ?? ''},
        employment_type = ${d.employment_type},
        hire_date = ${d.hire_date},
        birth_date = ${orNull(d.birth_date)},
        phone = ${d.phone ?? ''},
        emergency_contact = ${d.emergency_contact ?? ''},
        contract_review_date = ${orNull(d.contract_review_date)},
        contract_announce_date = ${orNull(d.contract_announce_date)},
        salary_review_date = ${orNull(d.salary_review_date)},
        salary_announce_date = ${orNull(d.salary_announce_date)},
        updated_at = now()
      where id = ${id}
    `
  } catch (error) {
    return { error: error instanceof Error ? error.message : '저장에 실패했습니다' }
  }

  revalidatePath('/employees')
  revalidatePath(`/employees/${id}`)
  return { error: null }
}
