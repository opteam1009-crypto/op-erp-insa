import { describe, it, expect } from 'vitest'
import { shouldRemind, buildReminderMessage } from './contract-reminders'

describe('shouldRemind', () => {
  it('reminds contract_review exactly 7 days out', () => {
    expect(shouldRemind('2026-09-01', '2026-08-25', 'contract_review')).toBe(true)
    expect(shouldRemind('2026-09-02', '2026-08-25', 'contract_review')).toBe(false)
  })

  it('reminds contract_announce 3 and 1 days out', () => {
    expect(shouldRemind('2026-08-28', '2026-08-25', 'contract_announce')).toBe(true)
    expect(shouldRemind('2026-08-26', '2026-08-25', 'contract_announce')).toBe(true)
    expect(shouldRemind('2026-08-27', '2026-08-25', 'contract_announce')).toBe(false)
  })

  it('reminds salary_review exactly 7 days out', () => {
    expect(shouldRemind('2026-09-01', '2026-08-25', 'salary_review')).toBe(true)
    expect(shouldRemind('2026-09-02', '2026-08-25', 'salary_review')).toBe(false)
  })

  it('reminds salary_announce 3 and 1 days out', () => {
    expect(shouldRemind('2026-08-28', '2026-08-25', 'salary_announce')).toBe(true)
    expect(shouldRemind('2026-08-26', '2026-08-25', 'salary_announce')).toBe(true)
    expect(shouldRemind('2026-08-27', '2026-08-25', 'salary_announce')).toBe(false)
  })
})

describe('buildReminderMessage', () => {
  it('builds a contract review reminder message', () => {
    expect(buildReminderMessage('홍길동', 'contract_review', 7)).toBe(
      '📋 홍길동님의 정규직 전환 평가일이 7일 남았습니다.'
    )
  })

  it('builds a contract announce reminder message', () => {
    expect(buildReminderMessage('홍길동', 'contract_announce', 1)).toBe(
      '📋 홍길동님의 정규직 전환 발표일이 1일 남았습니다.'
    )
  })

  it('builds a salary review reminder message', () => {
    expect(buildReminderMessage('홍길동', 'salary_review', 7)).toBe(
      '📋 홍길동님의 연봉협상 평가일이 7일 남았습니다.'
    )
  })

  it('builds a salary announce reminder message', () => {
    expect(buildReminderMessage('홍길동', 'salary_announce', 1)).toBe(
      '📋 홍길동님의 연봉협상 발표일이 1일 남았습니다.'
    )
  })
})
