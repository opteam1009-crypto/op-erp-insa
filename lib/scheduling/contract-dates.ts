import { addMonths, addDays, getDay, format, parseISO } from 'date-fns'

/**
 * Computes the 정규직 전환 평가일 (contract-conversion review date) from an
 * employee's hire date: +3 calendar months, then rolled forward to the next
 * Monday if that lands on a Saturday or Sunday. Public holidays are
 * deliberately ignored (weekday-only rule).
 *
 * Uses date-fns `parseISO` rather than the native `Date` constructor: a
 * date-only ISO string ("2026-01-17") is parsed by `parseISO` as local
 * midnight, whereas `new Date("2026-01-17")` is parsed as UTC midnight —
 * which can shift `getDay()`'s weekday result by a day depending on the
 * server's local timezone offset.
 */
export function calculateContractReviewDate(hireDate: string): string {
  const reviewDate = addMonths(parseISO(hireDate), 3)
  const dayOfWeek = getDay(reviewDate) // 0 = Sunday, 6 = Saturday

  const adjusted =
    dayOfWeek === 6 ? addDays(reviewDate, 2) : dayOfWeek === 0 ? addDays(reviewDate, 1) : reviewDate

  return format(adjusted, 'yyyy-MM-dd')
}

/**
 * 수습 계약 만료일. 입사일 +3개월이다.
 *
 * 평가일(calculateContractReviewDate)과 달리 주말로 밀지 않는다. 평가는 사람이
 * 모여서 하는 일정이라 평일이어야 하지만, 계약 만료는 달력상의 날짜라 토요일에
 * 끝나면 토요일에 끝난다.
 *
 * 인사대장의 '계약만료일' 실측 중앙값이 입사일 +90일이라 이 규칙을 따랐다.
 * 편차가 커서(61~364일) 기본값일 뿐이고, 실제 계약서가 다르면 목록에서 고친다.
 */
export function calculateContractEndDate(hireDate: string): string {
  return format(addMonths(parseISO(hireDate), 3), 'yyyy-MM-dd')
}
