import { describe, it, expect } from 'vitest'
import { toneForStatus } from './badge-tone'

describe('toneForStatus', () => {
  it('maps healthy states to positive', () => {
    expect(toneForStatus('재직')).toBe('positive')
    expect(toneForStatus('운영중')).toBe('positive')
    expect(toneForStatus('매출')).toBe('positive')
    expect(toneForStatus('미수금')).toBe('positive')
  })

  it('maps 휴직 to warning', () => {
    expect(toneForStatus('휴직')).toBe('warning')
  })

  it('maps ended and owed states to negative', () => {
    expect(toneForStatus('퇴사')).toBe('negative')
    expect(toneForStatus('폐업')).toBe('negative')
    expect(toneForStatus('미지급금')).toBe('negative')
  })

  it('maps 매입 to accent so it reads apart from 매출', () => {
    expect(toneForStatus('매입')).toBe('accent')
  })

  it('falls back to neutral for an unknown value', () => {
    expect(toneForStatus('미분류')).toBe('neutral')
    expect(toneForStatus('정규직')).toBe('neutral')
  })

  it('falls back to neutral for null and undefined', () => {
    expect(toneForStatus(null)).toBe('neutral')
    expect(toneForStatus(undefined)).toBe('neutral')
    expect(toneForStatus('')).toBe('neutral')
  })
})
