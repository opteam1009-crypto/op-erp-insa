import { describe, it, expect } from 'vitest'
import { isPurgeable } from './trash'

describe('isPurgeable', () => {
  it('returns false when not deleted', () => {
    expect(isPurgeable(null, new Date('2026-08-25'))).toBe(false)
  })

  it('returns false within the 30-day retention window', () => {
    expect(isPurgeable('2026-08-01T00:00:00Z', new Date('2026-08-25'))).toBe(false)
  })

  it('returns true after the 30-day retention window', () => {
    expect(isPurgeable('2026-07-01T00:00:00Z', new Date('2026-08-25'))).toBe(true)
  })
})
