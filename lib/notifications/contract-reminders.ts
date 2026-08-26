import { differenceInCalendarDays } from 'date-fns'

export type ReminderKind = 'contract_review' | 'contract_announce' | 'salary_review' | 'salary_announce'

const REVIEW_KINDS: readonly ReminderKind[] = ['contract_review', 'salary_review']

export function shouldRemind(targetDate: string, today: string, kind: ReminderKind): boolean {
  const days = differenceInCalendarDays(new Date(targetDate), new Date(today))
  if (REVIEW_KINDS.includes(kind)) return days === 7
  return days === 3 || days === 1
}

const KIND_LABELS: Record<ReminderKind, string> = {
  contract_review: '정규직 전환 평가일',
  contract_announce: '정규직 전환 발표일',
  salary_review: '연봉협상 평가일',
  salary_announce: '연봉협상 발표일',
}

export function buildReminderMessage(employeeName: string, kind: ReminderKind, daysLeft: number): string {
  return `📋 ${employeeName}님의 ${KIND_LABELS[kind]}이 ${daysLeft}일 남았습니다.`
}
