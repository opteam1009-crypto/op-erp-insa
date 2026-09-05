import { differenceInCalendarDays, parseISO } from 'date-fns'
import { KIND_LABELS, type ReminderKind } from './contract-reminders'

/**
 * 종 아이콘에 모아 보여줄 "곧 다가오는 일정".
 *
 * 크론의 shouldRemind와 규칙이 다르다. 크론은 정확히 7일 전(또는 3일/1일 전)에
 * 한 번 쏘는 발송 트리거고, 여기는 지금 뭐가 걸려 있는지 훑어보는 목록이라
 * 0~7일 사이를 전부 담는다. 크론 규칙을 그대로 쓰면 딱 7일 남은 날 하루만
 * 종에 불이 들어온다.
 */
export const UPCOMING_WINDOW_DAYS = 7

export interface UpcomingSource {
  id: string
  name: string
  contract_review_date: string | null
  contract_announce_date: string | null
  salary_review_date: string | null
  salary_announce_date: string | null
}

export interface UpcomingItem {
  employeeId: string
  employeeName: string
  kind: ReminderKind
  label: string
  date: string
  /** 0이면 오늘이다. */
  daysLeft: number
}

const FIELDS: [ReminderKind, keyof UpcomingSource][] = [
  ['contract_review', 'contract_review_date'],
  ['contract_announce', 'contract_announce_date'],
  ['salary_review', 'salary_review_date'],
  ['salary_announce', 'salary_announce_date'],
]

export function collectUpcoming(
  rows: UpcomingSource[],
  today: string,
  withinDays: number = UPCOMING_WINDOW_DAYS
): UpcomingItem[] {
  const items: UpcomingItem[] = []

  for (const row of rows) {
    for (const [kind, field] of FIELDS) {
      const date = row[field]
      if (!date) continue

      const daysLeft = differenceInCalendarDays(parseISO(date), parseISO(today))
      // 지난 일정은 빼고, 오늘(0)은 넣는다 — 오늘이 평가일인데 종이 조용하면
      // 알림으로서 쓸모가 없다.
      if (daysLeft < 0 || daysLeft > withinDays) continue

      items.push({
        employeeId: row.id,
        employeeName: row.name,
        kind,
        label: KIND_LABELS[kind],
        date,
        daysLeft,
      })
    }
  }

  // 급한 것부터. 같은 날이면 이름순이라 목록 순서가 새로고침마다 흔들리지 않는다.
  return items.sort(
    (a, b) => a.daysLeft - b.daysLeft || a.employeeName.localeCompare(b.employeeName, 'ko')
  )
}

/** "오늘" / "내일" / "3일 뒤" */
export function daysLeftLabel(daysLeft: number): string {
  if (daysLeft === 0) return '오늘'
  if (daysLeft === 1) return '내일'
  return `${daysLeft}일 뒤`
}
