import { addMonths, format, parseISO } from 'date-fns'

/** 'YYYY-MM' */
const MONTH_PARAM = /^\d{4}-(0[1-9]|1[0-2])$/

export function isMonth(value: string): boolean {
  return MONTH_PARAM.test(value)
}

/**
 * URL의 month 파라미터를 확정한다. 형식이 아니면 오늘이 속한 달로 떨어진다.
 * 손으로 고친 주소나 옛 링크가 빈 화면이나 500이 되지 않게 한다.
 */
export function resolveMonth(param: string | undefined, today: string): string {
  if (param && isMonth(param)) return param
  return today.slice(0, 7)
}

export function shiftMonth(month: string, by: number): string {
  return format(addMonths(parseISO(`${month}-01`), by), 'yyyy-MM')
}

/** "2026년 9월" */
export function monthLabel(month: string): string {
  const [year, mm] = month.split('-')
  return `${year}년 ${Number(mm)}월`
}
