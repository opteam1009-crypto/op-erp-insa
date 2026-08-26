import { describe, it, expect } from 'vitest'
import { franchiseStoreSchema } from './franchise-store'

describe('franchiseStoreSchema', () => {
  it('accepts a valid franchise store name', () => {
    expect(franchiseStoreSchema.safeParse({ name: '강남점' }).success).toBe(true)
  })

  it('rejects an empty name', () => {
    const result = franchiseStoreSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
  })
})
