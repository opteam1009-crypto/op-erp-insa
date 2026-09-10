import { describe, it, expect } from 'vitest'
import { isMonth, monthLabel, resolveMonth, shiftMonth } from './month'

describe('resolveMonth', () => {
  it('accepts a well-formed month', () => {
    expect(resolveMonth('2025-12', '2026-09-10')).toBe('2025-12')
  })

  it('falls back to the current month for anything else', () => {
    expect(resolveMonth(undefined, '2026-09-10')).toBe('2026-09')
    expect(resolveMonth('', '2026-09-10')).toBe('2026-09')
    expect(resolveMonth('2026-13', '2026-09-10')).toBe('2026-09')
    expect(resolveMonth('2026-9', '2026-09-10')).toBe('2026-09')
    expect(resolveMonth('2026-09-01', '2026-09-10')).toBe('2026-09')
    expect(resolveMonth('abc', '2026-09-10')).toBe('2026-09')
  })
})

describe('isMonth', () => {
  it('matches YYYY-MM only', () => {
    expect(isMonth('2026-09')).toBe(true)
    expect(isMonth('2026-00')).toBe(false)
    expect(isMonth('2026-9')).toBe(false)
  })
})

describe('shiftMonth / monthLabel', () => {
  it('crosses year boundaries', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
    expect(shiftMonth('2026-09', 0)).toBe('2026-09')
  })

  it('labels the month in Korean without a leading zero', () => {
    expect(monthLabel('2026-09')).toBe('2026년 9월')
    expect(monthLabel('2026-12')).toBe('2026년 12월')
  })
})
