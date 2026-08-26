import { describe, it, expect } from 'vitest'
import { calculateContractReviewDate } from './contract-dates'

describe('calculateContractReviewDate', () => {
  it('adds 3 months and keeps the date when the result is a weekday', () => {
    // 2026-01-15 is a Thursday; +3 months = 2026-04-15, a Wednesday (weekday, no roll).
    expect(calculateContractReviewDate('2026-01-15')).toBe('2026-04-15')
  })

  it('rolls a Saturday result forward to Monday (+2 days)', () => {
    // 2026-01-18 + 3 months = 2026-04-18, a Saturday -> rolls to 2026-04-20 (Monday).
    expect(calculateContractReviewDate('2026-01-18')).toBe('2026-04-20')
  })

  it('rolls a Sunday result forward to Monday (+1 day)', () => {
    // 2026-01-19 + 3 months = 2026-04-19, a Sunday -> rolls to 2026-04-20 (Monday).
    expect(calculateContractReviewDate('2026-01-19')).toBe('2026-04-20')
  })

  it('handles month-end clamping combined with a weekend roll', () => {
    // 2026-11-30 + 3 months: February 2027 has no 30th, so date-fns clamps to
    // 2027-02-28 -- which is a Sunday, so it rolls forward to 2027-03-01 (Monday).
    expect(calculateContractReviewDate('2026-11-30')).toBe('2027-03-01')
  })
})
