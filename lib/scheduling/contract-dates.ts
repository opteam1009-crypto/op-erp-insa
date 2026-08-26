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
