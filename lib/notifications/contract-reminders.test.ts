import { describe, it, expect } from 'vitest'
import { shouldRemind, buildReminderMessage } from './contract-reminders'

describe('shouldRemind', () => {
  it('reminds review dates exactly 7 days out', () => {
    expect(shouldRemind('2026-09-01', '2026-08-25', 'review')).toBe(true)
    expect(shouldRemind('2026-09-02', '2026-08-25', 'review')).toBe(false)
  })

  it('reminds announce dates 3 and 1 days out', () => {
    expect(shouldRemind('2026-08-28', '2026-08-25', 'announce')).toBe(true)
    expect(shouldRemind('2026-08-26', '2026-08-25', 'announce')).toBe(true)
    expect(shouldRemind('2026-08-27', '2026-08-25', 'announce')).toBe(false)
  })
})

describe('buildReminderMessage', () => {
  it('builds a review reminder message', () => {
    expect(buildReminderMessage('홍길동', 'review', 7)).toBe(
      '📋 홍길동님의 정규직 전환 평가일이 7일 남았습니다.'
    )
  })

  it('builds an announce reminder message', () => {
    expect(buildReminderMessage('홍길동', 'announce', 1)).toBe(
      '📋 홍길동님의 정규직 전환 발표일이 1일 남았습니다.'
    )
  })
})
