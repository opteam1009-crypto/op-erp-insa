import { describe, it, expect } from 'vitest'
import { collectUpcoming, daysLeftLabel, type UpcomingSource } from './upcoming'

const blank: UpcomingSource = {
  id: 'a',
  name: '홍길동',
  contract_review_date: null,
  contract_announce_date: null,
  salary_review_date: null,
  salary_announce_date: null,
}

describe('collectUpcoming', () => {
  it('keeps dates from today through the window and drops the rest', () => {
    const rows = [
      { ...blank, id: '1', name: '어제', contract_review_date: '2026-09-04' },
      { ...blank, id: '2', name: '오늘', contract_review_date: '2026-09-05' },
      { ...blank, id: '3', name: '7일뒤', contract_review_date: '2026-09-12' },
      { ...blank, id: '4', name: '8일뒤', contract_review_date: '2026-09-13' },
    ]
    expect(collectUpcoming(rows, '2026-09-05').map((i) => i.employeeName)).toEqual([
      '오늘',
      '7일뒤',
    ])
  })

  it('emits one item per date a single employee has', () => {
    const rows = [
      {
        ...blank,
        contract_review_date: '2026-09-06',
        salary_announce_date: '2026-09-08',
      },
    ]
    const items = collectUpcoming(rows, '2026-09-05')
    expect(items).toHaveLength(2)
    expect(items.map((i) => i.label)).toEqual(['정규직 전환 평가일', '연봉협상 발표일'])
  })

  it('sorts by urgency, then by name so the order is stable', () => {
    const rows = [
      { ...blank, id: '1', name: '나중', contract_review_date: '2026-09-09' },
      { ...blank, id: '2', name: '하나', contract_review_date: '2026-09-06' },
      { ...blank, id: '3', name: '가나', contract_review_date: '2026-09-06' },
    ]
    expect(collectUpcoming(rows, '2026-09-05').map((i) => i.employeeName)).toEqual([
      '가나',
      '하나',
      '나중',
    ])
  })

  it('labels the near days in words', () => {
    expect(daysLeftLabel(0)).toBe('오늘')
    expect(daysLeftLabel(1)).toBe('내일')
    expect(daysLeftLabel(5)).toBe('5일 뒤')
  })
})
