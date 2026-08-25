import { differenceInCalendarDays } from 'date-fns'

export type ContractDateType = 'review' | 'announce'

export function shouldRemind(targetDate: string, today: string, dateType: ContractDateType): boolean {
  const days = differenceInCalendarDays(new Date(targetDate), new Date(today))
  if (dateType === 'review') return days === 7
  return days === 3 || days === 1
}

export function buildReminderMessage(employeeName: string, dateType: ContractDateType, daysLeft: number): string {
  const label = dateType === 'review' ? '정규직 전환 평가일' : '정규직 전환 발표일'
  return `📋 ${employeeName}님의 ${label}이 ${daysLeft}일 남았습니다.`
}
