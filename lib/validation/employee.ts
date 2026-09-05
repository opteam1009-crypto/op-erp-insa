import { z } from 'zod'

const dateOrEmpty = z.iso.date('날짜 형식은 YYYY-MM-DD 입니다').optional().or(z.literal(''))

/**
 * 등록·수정 폼의 직급 선택지. 인사대장에 실제로 쓰인 값들이다(위에서 아래로
 * 상위 직급 순).
 *
 * DB 컬럼에는 check 제약이 없다 — 엑셀 일괄 등록은 대장에 적힌 값을 그대로
 * 받아야 하고, 목록에 없는 직급이 들어올 수 있다. 그래서 수정 폼은 현재 값이
 * 이 목록에 없으면 그 값을 선택지에 끼워 넣는다. 안 그러면 저장할 때 조용히
 * 다른 직급으로 바뀐다.
 */
export const POSITIONS = ['대표', '차장', '과장', '대리', '주임', '사원'] as const

export const employeeSchema = z.object({
  employee_number: z.string().min(1, '사번은 필수입니다'),
  name: z.string().min(1, '이름은 필수입니다'),
  department_id: z.string().uuid().nullable(),
  position: z.string().optional(),
  employment_type: z.enum(['정규직', '계약직', '인턴', '프리랜서']),
  hire_date: z.iso.date('입사일 형식은 YYYY-MM-DD 입니다'),
  birth_date: dateOrEmpty,
  phone: z.string().optional(),
  emergency_contact: z.string().optional(),
  contract_review_date: dateOrEmpty,
  contract_announce_date: dateOrEmpty,
  salary_review_date: dateOrEmpty,
  salary_announce_date: dateOrEmpty,
})

export type EmployeeInput = z.infer<typeof employeeSchema>
