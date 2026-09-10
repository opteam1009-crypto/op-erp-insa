import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getDay,
  parseISO,
  startOfWeek,
} from 'date-fns'
import type { BadgeTone } from '@/lib/ui/badge-tone'
import { KIND_LABELS, type ReminderKind } from '@/lib/notifications/contract-reminders'

/**
 * 캘린더에 올리는 날짜 종류.
 *
 * 종(NotificationBell)이 쓰는 네 가지에 목록의 계약만료일·정규직전환일을
 * 더했다. 연봉협상월은 여기 없다 — 특정 날짜가 아니라 달이라 칸에 놓을 자리가
 * 없고, 달 위에 띠로 따로 보인다(CalendarMonth.salaryMonth).
 */
export type CalendarEventKind = ReminderKind | 'contract_end' | 'regular_conversion'

/**
 * 범례 한 줄이자 켜고 끄는 단위.
 *
 * 평가일과 발표일은 한 짝이라 색을 같이 쓰고 함께 켜고 끈다. 여섯 종류에
 * 색 여섯을 주면 범례가 표보다 먼저 눈에 들어온다.
 */
export type CalendarGroupId =
  | 'contract_end'
  | 'contract_review'
  | 'regular_conversion'
  | 'salary_review'
  | 'salary_month'

export interface CalendarGroup {
  id: CalendarGroupId
  label: string
  /** Badge의 TONE_CLASS 키. 부서 배지와 달리 종류가 고정이라 톤을 직접 고른다. */
  tone: BadgeTone
}

// 재직상태(초록/빨강)와 근로형태(하늘/주황)에 쓰는 톤과 겹치지 않게 골랐다.
// 계약만료만 rose다 — 놓치면 곤란한 기한이라 눈에 먼저 걸려야 한다.
export const CALENDAR_GROUPS: readonly CalendarGroup[] = [
  { id: 'contract_end', label: '계약만료일', tone: 'rose' },
  { id: 'contract_review', label: '정규직전환 평가·발표', tone: 'sky' },
  { id: 'regular_conversion', label: '정규직전환일', tone: 'emerald' },
  { id: 'salary_review', label: '연봉협상 평가·발표', tone: 'violet' },
  { id: 'salary_month', label: '연봉협상월', tone: 'amber' },
]

export interface CalendarSource {
  id: string
  name: string
  contract_end_date: string | null
  contract_review_date: string | null
  contract_announce_date: string | null
  regular_conversion_date: string | null
  salary_review_date: string | null
  salary_announce_date: string | null
  salary_negotiation_month: number | null
}

type DateField = Exclude<keyof CalendarSource, 'id' | 'name' | 'salary_negotiation_month'>

interface KindSpec {
  kind: CalendarEventKind
  field: DateField
  group: CalendarGroupId
  /** 달력 칸에 들어가는 짧은 이름. 이름 옆에 붙으므로 '일'은 뺀다. */
  short: string
}

// 순서가 곧 같은 날 안에서의 정렬 순서다. 기한(계약만료)이 맨 위에 온다.
const KINDS: readonly KindSpec[] = [
  { kind: 'contract_end', field: 'contract_end_date', group: 'contract_end', short: '계약만료' },
  { kind: 'contract_review', field: 'contract_review_date', group: 'contract_review', short: '정규직평가' },
  { kind: 'contract_announce', field: 'contract_announce_date', group: 'contract_review', short: '정규직발표' },
  { kind: 'regular_conversion', field: 'regular_conversion_date', group: 'regular_conversion', short: '정규직전환' },
  { kind: 'salary_review', field: 'salary_review_date', group: 'salary_review', short: '연봉평가' },
  { kind: 'salary_announce', field: 'salary_announce_date', group: 'salary_review', short: '연봉발표' },
]

/** 목록이나 툴팁에 쓰는 온전한 이름. 종과 같은 문구를 쓴다. */
export const CALENDAR_KIND_LABELS: Record<CalendarEventKind, string> = {
  ...KIND_LABELS,
  contract_end: '계약만료일',
  regular_conversion: '정규직전환일',
}

export interface CalendarEvent {
  employeeId: string
  employeeName: string
  kind: CalendarEventKind
  group: CalendarGroupId
  short: string
  /** YYYY-MM-DD */
  date: string
}

export interface CalendarDay {
  /** YYYY-MM-DD */
  date: string
  /** 1~31 */
  day: number
  /** 보고 있는 달에 속하는지. 앞뒤 달의 자투리 날은 흐리게 그린다. */
  inMonth: boolean
  /** 0 = 일요일 … 6 = 토요일 */
  weekday: number
}

export interface CalendarPerson {
  employeeId: string
  employeeName: string
}

export interface CalendarMonth {
  /** YYYY-MM */
  month: string
  /** "2026년 9월" */
  label: string
  /** 일요일에서 시작하는 주 단위 격자. 4~6줄. */
  weeks: CalendarDay[][]
  /** 날짜 → 그날 일정. 격자에 보이는 앞뒤 달 날짜의 일정도 들어 있다. */
  eventsByDate: Record<string, CalendarEvent[]>
  /** 이달이 연봉협상월인 사원. 이름순. */
  salaryMonth: CalendarPerson[]
  /** 이달(앞뒤 달 자투리 제외) 일정 수에 연봉협상 대상 수를 더한 것. */
  total: number
}

export const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const

const MONTH_PARAM = /^\d{4}-(0[1-9]|1[0-2])$/

/**
 * URL의 month 파라미터를 확정한다. 형식이 아니면 오늘이 속한 달로 떨어진다.
 * 손으로 고친 주소나 옛 링크가 빈 화면이나 500이 되지 않게 한다.
 */
export function resolveMonth(param: string | undefined, today: string): string {
  if (param && MONTH_PARAM.test(param)) return param
  return today.slice(0, 7)
}

export function shiftMonth(month: string, by: number): string {
  return format(addMonths(parseISO(`${month}-01`), by), 'yyyy-MM')
}

export function monthLabel(month: string): string {
  const [year, mm] = month.split('-')
  return `${year}년 ${Number(mm)}월`
}

/** "9월 18일 (금)" — 모바일 목록의 날짜 머리글. */
export function formatDayLabel(date: string): string {
  const d = parseISO(date)
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAY_LABELS[getDay(d)]})`
}

/**
 * 달력 격자. 첫째 주 앞과 마지막 주 뒤를 이웃 달의 날로 채워 항상 7의 배수다.
 *
 * date-fns의 지역 시간 연산만 쓴다. 날짜만 있는 문자열을 parseISO로 읽으면
 * 지역 자정이 되고 format도 지역 날짜를 내놓으므로, 서버(UTC)에서 돌든
 * 브라우저(KST)에서 돌든 같은 격자가 나온다.
 */
export function buildMonthGrid(month: string): CalendarDay[][] {
  const first = parseISO(`${month}-01`)
  const days = eachDayOfInterval({
    start: startOfWeek(first, { weekStartsOn: 0 }),
    end: endOfWeek(endOfMonth(first), { weekStartsOn: 0 }),
  })

  const weeks: CalendarDay[][] = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(
      days.slice(i, i + 7).map((d) => ({
        date: format(d, 'yyyy-MM-dd'),
        day: d.getDate(),
        inMonth: format(d, 'yyyy-MM') === month,
        weekday: getDay(d),
      }))
    )
  }
  return weeks
}

/**
 * from~to(둘 다 포함) 사이의 일정을 날짜순으로 모은다.
 *
 * 날짜 문자열은 YYYY-MM-DD라 문자열 비교가 곧 날짜 비교다. Date로 바꾸지
 * 않으므로 타임존이 끼어들 틈이 없다.
 */
export function collectCalendarEvents(
  rows: CalendarSource[],
  from: string,
  to: string
): CalendarEvent[] {
  const events: CalendarEvent[] = []

  for (const row of rows) {
    for (const spec of KINDS) {
      const date = row[spec.field]
      if (!date || date < from || date > to) continue
      events.push({
        employeeId: row.id,
        employeeName: row.name,
        kind: spec.kind,
        group: spec.group,
        short: spec.short,
        date,
      })
    }
  }

  const order = (kind: CalendarEventKind) => KINDS.findIndex((k) => k.kind === kind)

  // 날짜 → 종류(기한 먼저) → 이름. 같은 조건이면 늘 같은 순서라 새로고침마다
  // 칸 안의 줄이 뒤바뀌지 않는다.
  return events.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      order(a.kind) - order(b.kind) ||
      a.employeeName.localeCompare(b.employeeName, 'ko')
  )
}

export function buildCalendarMonth(rows: CalendarSource[], month: string): CalendarMonth {
  const weeks = buildMonthGrid(month)
  const first = weeks[0][0].date
  const last = weeks[weeks.length - 1][6].date

  const eventsByDate: Record<string, CalendarEvent[]> = {}
  let inMonthCount = 0
  for (const event of collectCalendarEvents(rows, first, last)) {
    ;(eventsByDate[event.date] ??= []).push(event)
    if (event.date.startsWith(month)) inMonthCount += 1
  }

  const monthNumber = Number(month.slice(5))
  const salaryMonth = rows
    .filter((row) => row.salary_negotiation_month === monthNumber)
    .map((row) => ({ employeeId: row.id, employeeName: row.name }))
    .sort((a, b) => a.employeeName.localeCompare(b.employeeName, 'ko'))

  return {
    month,
    label: monthLabel(month),
    weeks,
    eventsByDate,
    salaryMonth,
    total: inMonthCount + salaryMonth.length,
  }
}
