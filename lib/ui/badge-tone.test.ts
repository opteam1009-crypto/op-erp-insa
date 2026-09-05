import { describe, it, expect } from 'vitest'
import { hueForDepartmentIndex, toneForStatus } from './badge-tone'

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
    expect(toneForStatus('파견직')).toBe('neutral')
  })

  it('keeps 근로형태 clear of the 재직상태 colours it sits beside', () => {
    // 두 열이 나란히 놓인다. 같은 색조를 쓰면 어느 쪽을 읽고 있는지 흐려진다.
    expect(toneForStatus('정규직')).not.toBe(toneForStatus('재직'))
    expect(toneForStatus('계약직')).not.toBe(toneForStatus('퇴사'))
    expect(toneForStatus('계약직')).not.toBe(toneForStatus('휴직'))
  })

  it('falls back to neutral for null and undefined', () => {
    expect(toneForStatus(null)).toBe('neutral')
    expect(toneForStatus(undefined)).toBe('neutral')
    expect(toneForStatus('')).toBe('neutral')
  })
})

describe('hueForDepartmentIndex', () => {
  it('gives every department its own colour at the sizes we actually have', () => {
    // 지금 17개다. 고정 팔레트를 쓰던 때는 여기서 색이 겹쳤다.
    const hues = Array.from({ length: 30 }, (_, i) => hueForDepartmentIndex(i))
    expect(new Set(hues).size).toBe(hues.length)
  })

  it('keeps neighbouring entries far apart on the wheel', () => {
    for (let i = 0; i < 20; i++) {
      const gap = Math.abs(hueForDepartmentIndex(i + 1) - hueForDepartmentIndex(i))
      expect(Math.min(gap, 360 - gap)).toBeGreaterThan(80)
    }
  })

  it('does not move the colours already in use when a department is added', () => {
    // 부서를 하나 더 만들었다고 어제 보던 부서 색이 전부 바뀌면 안 된다.
    expect(hueForDepartmentIndex(0)).toBe(0)
    expect(hueForDepartmentIndex(5)).toBe(hueForDepartmentIndex(5))
  })
})
