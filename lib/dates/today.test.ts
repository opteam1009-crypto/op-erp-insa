import { describe, it, expect } from 'vitest'
import { todayInSeoul } from './today'

describe('todayInSeoul', () => {
  it('returns YYYY-MM-DD', () => {
    expect(todayInSeoul(new Date('2026-09-10T03:00:00Z'))).toBe('2026-09-10')
  })

  it('rolls over at 15:00 UTC, which is midnight in Seoul', () => {
    // UTC 기준으로는 아직 10일 저녁이지만 한국은 이미 11일이다.
    expect(todayInSeoul(new Date('2026-09-10T14:59:59Z'))).toBe('2026-09-10')
    expect(todayInSeoul(new Date('2026-09-10T15:00:00Z'))).toBe('2026-09-11')
  })
})
