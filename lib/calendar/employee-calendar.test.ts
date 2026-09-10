import { describe, it, expect } from 'vitest'
import {
  buildCalendarMonth,
  buildMonthGrid,
  collectCalendarEvents,
  formatDayLabel,
  type CalendarSource,
} from './employee-calendar'

const blank: CalendarSource = {
  id: 'a',
  name: '홍길동',
  contract_end_date: null,
  contract_review_date: null,
  contract_announce_date: null,
  regular_conversion_date: null,
  salary_review_date: null,
  salary_announce_date: null,
  salary_negotiation_month: null,
}

describe('buildMonthGrid', () => {
  it('starts on Sunday and pads to whole weeks', () => {
    // 2026-09-01은 화요일이다. 앞에 8/30(일), 8/31(월)이 붙는다.
    const weeks = buildMonthGrid('2026-09')
    expect(weeks).toHaveLength(5)
    expect(weeks.every((w) => w.length === 7)).toBe(true)
    expect(weeks[0][0]).toEqual({ date: '2026-08-30', day: 30, inMonth: false, weekday: 0 })
    expect(weeks[0][2]).toEqual({ date: '2026-09-01', day: 1, inMonth: true, weekday: 2 })
    expect(weeks[4][6]).toEqual({ date: '2026-10-03', day: 3, inMonth: false, weekday: 6 })
  })

  it('is four rows when the month fits exactly', () => {
    // 2026-02-01은 일요일이고 28일까지라 자투리가 없다.
    const weeks = buildMonthGrid('2026-02')
    expect(weeks).toHaveLength(4)
    expect(weeks.flat().every((d) => d.inMonth)).toBe(true)
  })

  it('is six rows when a long month starts late in the week', () => {
    // 2026-05-01은 금요일이고 31일까지다.
    expect(buildMonthGrid('2026-05')).toHaveLength(6)
  })
})

describe('collectCalendarEvents', () => {
  it('keeps only dates inside the range and skips empty fields', () => {
    const rows = [
      { ...blank, id: '1', name: '안', contract_end_date: '2026-08-29' },
      { ...blank, id: '2', name: '경계', contract_end_date: '2026-08-30' },
      { ...blank, id: '3', name: '끝', regular_conversion_date: '2026-10-03' },
      { ...blank, id: '4', name: '밖', regular_conversion_date: '2026-10-04' },
    ]
    const dates = collectCalendarEvents(rows, '2026-08-30', '2026-10-03').map((e) => e.date)
    expect(dates).toEqual(['2026-08-30', '2026-10-03'])
  })

  it('emits one event per date a single employee has', () => {
    const rows = [
      {
        ...blank,
        contract_review_date: '2026-09-14',
        contract_announce_date: '2026-09-16',
        salary_review_date: '2026-09-21',
      },
    ]
    const events = collectCalendarEvents(rows, '2026-09-01', '2026-09-30')
    expect(events.map((e) => [e.kind, e.group, e.short])).toEqual([
      ['contract_review', 'contract_review', '정규직평가'],
      ['contract_announce', 'contract_review', '정규직발표'],
      ['salary_review', 'salary_review', '연봉평가'],
    ])
  })

  it('sorts by date, then deadline first, then name', () => {
    const rows = [
      { ...blank, id: '1', name: '나', salary_announce_date: '2026-09-10' },
      { ...blank, id: '2', name: '가', contract_end_date: '2026-09-10' },
      { ...blank, id: '3', name: '다', contract_end_date: '2026-09-10' },
      { ...blank, id: '4', name: '라', contract_end_date: '2026-09-09' },
    ]
    expect(
      collectCalendarEvents(rows, '2026-09-01', '2026-09-30').map((e) => e.employeeName)
    ).toEqual(['라', '가', '다', '나'])
  })
})

describe('buildCalendarMonth', () => {
  const rows: CalendarSource[] = [
    { ...blank, id: '1', name: '이달', contract_end_date: '2026-09-18', salary_negotiation_month: 9 },
    { ...blank, id: '2', name: '자투리', regular_conversion_date: '2026-08-31' },
    { ...blank, id: '3', name: '다른달', contract_end_date: '2026-11-01', salary_negotiation_month: 11 },
    { ...blank, id: '4', name: '가월', salary_negotiation_month: 9 },
  ]

  it('groups events by date, including the neighbouring days shown in the grid', () => {
    const month = buildCalendarMonth(rows, '2026-09')
    expect(Object.keys(month.eventsByDate).sort()).toEqual(['2026-08-31', '2026-09-18'])
    expect(month.eventsByDate['2026-09-18'][0]).toMatchObject({
      employeeName: '이달',
      kind: 'contract_end',
    })
  })

  it('lists employees whose salary month is this month, by name', () => {
    const month = buildCalendarMonth(rows, '2026-09')
    expect(month.salaryMonth.map((p) => p.employeeName)).toEqual(['가월', '이달'])
  })

  it('counts this month only: in-month events plus salary-month people', () => {
    const month = buildCalendarMonth(rows, '2026-09')
    // 계약만료 1건(자투리 8/31은 제외) + 연봉협상 대상 2명
    expect(month.total).toBe(3)
    expect(month.label).toBe('2026년 9월')
    expect(month.month).toBe('2026-09')
  })

  it('is empty but well-formed for a quiet month', () => {
    const month = buildCalendarMonth(rows, '2026-03')
    expect(month.eventsByDate).toEqual({})
    expect(month.salaryMonth).toEqual([])
    expect(month.total).toBe(0)
    expect(month.weeks.length).toBeGreaterThanOrEqual(4)
  })
})

describe('formatDayLabel', () => {
  it('renders month, day and weekday', () => {
    expect(formatDayLabel('2026-09-18')).toBe('9월 18일 (금)')
    expect(formatDayLabel('2026-01-04')).toBe('1월 4일 (일)')
  })
})
