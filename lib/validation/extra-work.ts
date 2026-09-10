import { z } from 'zod'
import { EXTRA_WORK_KINDS } from '@/lib/extra-work/extra-work'

export const extraWorkKindSchema = z.enum(EXTRA_WORK_KINDS)

export const periodSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, '월 형식은 YYYY-MM 입니다')

/**
 * 목록에서 치는 시간. 빈 문자열은 '모름'이라 통과시키고 NULL로 저장한다.
 * 소수점 한 자리까지다 — DB 컬럼이 numeric(5,1)이라 더 적어도 잘린다.
 */
export const hoursInputSchema = z
  .string()
  .trim()
  .regex(/^(|\d{1,3}(\.\d)?)$/, '시간은 숫자로, 소수점 한 자리까지입니다')
  .refine((v) => v === '' || Number(v) <= 744, '한 달은 744시간을 넘을 수 없습니다')

export const noteInputSchema = z.string().trim().max(100, '메모는 100자까지입니다')

export const addTargetsSchema = z.object({
  kind: extraWorkKindSchema,
  period: periodSchema,
  employeeIds: z.array(z.uuid()).min(1, '사원을 한 명 이상 고르세요').max(200),
})

export type AddTargetsInput = z.infer<typeof addTargetsSchema>

/**
 * 제출 서류로 받는 파일. 증빙·급여대장과 달리 MIME이 아니라 확장자로 거른다.
 * 연장근무 신청서는 hwp나 docx로 오는 일이 많은데, hwp의 MIME은 브라우저와
 * OS마다 달라(octet-stream으로 오기도 한다) MIME 목록으로는 정확히 못 거른다.
 */
export const EXTRA_WORK_FILE_EXTENSIONS = [
  'pdf', 'jpg', 'jpeg', 'png', 'xlsx', 'xls', 'docx', 'doc', 'hwp', 'hwpx',
] as const

/** <input type="file" accept> 값. */
export const EXTRA_WORK_FILE_ACCEPT = EXTRA_WORK_FILE_EXTENSIONS.map((e) => `.${e}`).join(',')

export function hasAllowedExtraWorkExtension(fileName: string): boolean {
  const dot = fileName.lastIndexOf('.')
  if (dot < 0) return false
  const ext = fileName.slice(dot + 1).toLowerCase()
  return (EXTRA_WORK_FILE_EXTENSIONS as readonly string[]).includes(ext)
}
