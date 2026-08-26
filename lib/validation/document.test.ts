import { describe, it, expect } from 'vitest'
import { documentMetaSchema } from './document'

describe('documentMetaSchema', () => {
  const valid = {
    doc_type: '세금계산서' as const,
    year: 2026,
    month: 8,
    vendor_name: '스터디원 주식회사',
    transaction_type: '매출' as const,
    amount: 500000,
    franchise_store_id: null,
  }

  it('accepts valid metadata', () => {
    expect(documentMetaSchema.safeParse(valid).success).toBe(true)
  })

  it('rejects an invalid doc_type', () => {
    const result = documentMetaSchema.safeParse({ ...valid, doc_type: '영수증묶음' })
    expect(result.success).toBe(false)
  })

  it('rejects a month outside 1-12', () => {
    const result = documentMetaSchema.safeParse({ ...valid, month: 13 })
    expect(result.success).toBe(false)
  })

  it('rejects an invalid transaction_type', () => {
    const result = documentMetaSchema.safeParse({ ...valid, transaction_type: '기타' })
    expect(result.success).toBe(false)
  })

  it('rejects a zero or negative amount', () => {
    expect(documentMetaSchema.safeParse({ ...valid, amount: 0 }).success).toBe(false)
    expect(documentMetaSchema.safeParse({ ...valid, amount: -100 }).success).toBe(false)
  })

  it('accepts a non-null franchise_store_id', () => {
    const result = documentMetaSchema.safeParse({
      ...valid,
      franchise_store_id: '11111111-1111-4111-8111-111111111111',
    })
    expect(result.success).toBe(true)
  })
})
