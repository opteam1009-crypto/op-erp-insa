import { describe, it, expect } from 'vitest'
import {
  EXTRA_WORK_KIND_INFO,
  EXTRA_WORK_KINDS,
  formatHours,
  pendingListText,
  summarizeExtraWork,
  type ExtraWorkRow,
} from './extra-work'

const row = (over: Partial<ExtraWorkRow>): ExtraWorkRow => ({
  id: 'x',
  employee_id: 'e',
  employee_number: '0001',
  employee_name: '홍길동',
  department_name: '회계팀',
  hours: null,
  note: null,
  submitted_on: null,
  file_name: null,
  ...over,
})

describe('EXTRA_WORK_KIND_INFO', () => {
  it('has a distinct route for every kind', () => {
    const hrefs = EXTRA_WORK_KINDS.map((k) => EXTRA_WORK_KIND_INFO[k].href)
    expect(new Set(hrefs).size).toBe(EXTRA_WORK_KINDS.length)
    expect(hrefs.every((h) => h.startsWith('/payroll/'))).toBe(true)
  })
})

describe('summarizeExtraWork', () => {
  it('counts submitted and pending and sums the hours that exist', () => {
    const summary = summarizeExtraWork([
      row({ id: '1', submitted_on: '2026-09-12', hours: '12.5' }),
      row({ id: '2', hours: '3.0' }),
      row({ id: '3' }),
    ])
    expect(summary).toEqual({ total: 3, submitted: 1, pending: 2, hours: 15.5 })
  })

  it('is all zeros for an empty month', () => {
    expect(summarizeExtraWork([])).toEqual({ total: 0, submitted: 0, pending: 0, hours: 0 })
  })
})

describe('formatHours', () => {
  it('drops a trailing .0 and keeps a real decimal', () => {
    expect(formatHours('12.0')).toBe('12')
    expect(formatHours('12.5')).toBe('12.5')
    expect(formatHours(7)).toBe('7')
  })

  it('shows a dash when there is nothing', () => {
    expect(formatHours(null)).toBe('-')
    expect(formatHours('')).toBe('-')
    expect(formatHours('abc')).toBe('-')
  })
})

describe('pendingListText', () => {
  it('groups the unsubmitted by department, sorted, with a headline count', () => {
    const rows = [
      row({ id: '1', employee_name: '변정득', department_name: '회계팀' }),
      row({ id: '2', employee_name: '김범수', department_name: '마케팅부' }),
      row({ id: '3', employee_name: '허진혁', department_name: '마케팅부' }),
      row({ id: '4', employee_name: '제출함', department_name: '마케팅부', submitted_on: '2026-09-10' }),
      row({ id: '5', employee_name: '문성혁', department_name: null }),
    ]
    expect(pendingListText(rows, '연장근무', '2026년 9월')).toBe(
      [
        '2026년 9월 연장근무 서류 미제출 4명',
        '· 마케팅부: 김범수, 허진혁',
        '· 부서 미지정: 문성혁',
        '· 회계팀: 변정득',
      ].join('\n')
    )
  })

  it('is just the headline when everyone has submitted', () => {
    const rows = [row({ submitted_on: '2026-09-10' })]
    expect(pendingListText(rows, '휴일근무', '2026년 9월')).toBe('2026년 9월 휴일근무 서류 미제출 0명')
  })
})
