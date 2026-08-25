import { z } from 'zod'

const dateOrEmpty = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식은 YYYY-MM-DD 입니다')
  .optional()
  .or(z.literal(''))

export const employeeSchema = z.object({
  employee_number: z.string().min(1, '사번은 필수입니다'),
  name: z.string().min(1, '이름은 필수입니다'),
  department_id: z.string().uuid().nullable(),
  position: z.string().optional(),
  employment_type: z.enum(['정규직', '계약직', '인턴', '프리랜서']),
  hire_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '입사일 형식은 YYYY-MM-DD 입니다'),
  birth_date: dateOrEmpty,
  phone: z.string().optional(),
  emergency_contact: z.string().optional(),
  contract_review_date: dateOrEmpty,
  contract_announce_date: dateOrEmpty,
})

export type EmployeeInput = z.infer<typeof employeeSchema>
