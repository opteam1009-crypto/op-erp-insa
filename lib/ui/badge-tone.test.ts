import { describe, it, expect } from 'vitest'
import { toneForDepartment, toneForStatus } from './badge-tone'

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

describe('toneForDepartment', () => {
  it('gives one department the same colour every time', () => {
    expect(toneForDepartment('개발팀')).toBe(toneForDepartment('개발팀'))
  })

  it('separates departments that differ by a single character', () => {
    // 콘텐츠팀 / 매장콘텐츠팀처럼 이름이 겹치는 부서가 실제로 있다.
    expect(toneForDepartment('콘텐츠팀')).not.toBe(toneForDepartment('매장콘텐츠팀'))
  })

  it('falls back to neutral when there is no department', () => {
    expect(toneForDepartment(null)).toBe('neutral')
    expect(toneForDepartment('')).toBe('neutral')
  })
})
