'use server'

import { revalidatePath } from 'next/cache'
import { sql } from '@/lib/db/sql'
import { employeeSchema, type EmployeeInput } from '@/lib/validation/employee'
import { isSignedIn } from '@/lib/auth/current-user'
import {
  calculateContractReviewDate,
  calculateContractEndDate,
} from '@/lib/scheduling/contract-dates'
import { z } from 'zod'

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
        contract_review_date, contract_end_date, contract_announce_date,
        salary_review_date, salary_announce_date
      ) values (
        ${d.employee_number}, ${d.name}, ${orNull(d.department_id)}, ${d.position ?? ''},
        ${d.employment_type}, ${d.hire_date}, ${orNull(d.birth_date)}, ${d.phone ?? ''},
        ${d.emergency_contact ?? ''},
        -- 등록 시점에 항상 계산한다. 클라이언트 입력을 받지 않는다.
        ${calculateContractReviewDate(d.hire_date)},
        ${calculateContractEndDate(d.hire_date)},
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

/**
 * 목록 테이블에서 한 칸만 고치는 경로.
 *
 * 열 이름을 그대로 SQL에 끼워 넣으면 클라이언트가 아무 컬럼이나 지정할 수 있게
 * 된다. sql 태그드 템플릿은 값만 파라미터로 바인딩하고 식별자는 바인딩하지
 * 못하므로, 고칠 수 있는 열은 아래 분기로 못박는다 — 여기 없는 이름은 애초에
 * 도달할 SQL이 없다.
 */
const INLINE_SCHEMAS = {
  status: z.enum(['재직', '휴직', '퇴사']),
  job_title: z.string().trim().max(20, '직책은 20자까지입니다'),
  contract_end_date: z.union([z.iso.date('날짜 형식은 YYYY-MM-DD 입니다'), z.literal('')]),
  regular_conversion_date: z.union([z.iso.date('날짜 형식은 YYYY-MM-DD 입니다'), z.literal('')]),
  salary_negotiation_month: z
    .string()
    .regex(/^(|[1-9]|1[0-2])$/, '연봉협상월은 1~12 사이입니다'),
} as const

export type InlineField = keyof typeof INLINE_SCHEMAS

export async function updateEmployeeField(id: string, field: InlineField, raw: string) {
  if (!(await isSignedIn())) return { error: '로그인이 필요합니다' }

  const schema = INLINE_SCHEMAS[field]
  if (!schema) return { error: '수정할 수 없는 항목입니다' }

  const parsed = schema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues.map((i) => i.message).join(', ') }

  const value = parsed.data

  try {
    switch (field) {
      case 'status':
        await sql`update employees set status = ${value}, updated_at = now() where id = ${id}`
        break
      case 'job_title':
        await sql`update employees set job_title = ${orNull(value)}, updated_at = now() where id = ${id}`
        break
      case 'contract_end_date':
        await sql`update employees set contract_end_date = ${orNull(value)}, updated_at = now() where id = ${id}`
        break
      case 'regular_conversion_date':
        await sql`update employees set regular_conversion_date = ${orNull(value)}, updated_at = now() where id = ${id}`
        break
      case 'salary_negotiation_month':
        await sql`update employees set salary_negotiation_month = ${value ? Number(value) : null}, updated_at = now() where id = ${id}`
        break
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : '저장에 실패했습니다' }
  }

  revalidatePath('/employees')
  revalidatePath(`/employees/${id}`)
  return { error: null }
}
