import { describe, it, expect } from 'vitest'
import { documentMetaSchema } from './document'

describe('documentMetaSchema', () => {
  it('accepts valid metadata', () => {
    const result = documentMetaSchema.safeParse({
      doc_type: '세금계산서',
      year: 2026,
      month: 8,
      vendor_name: '스터디원 주식회사',
    })
    expect(result.success).toBe(true)
  })

  it('rejects an invalid doc_type', () => {
    const result = documentMetaSchema.safeParse({ doc_type: '영수증묶음', year: 2026, month: 8, vendor_name: '' })
    expect(result.success).toBe(false)
  })

  it('rejects a month outside 1-12', () => {
    const result = documentMetaSchema.safeParse({ doc_type: '기타', year: 2026, month: 13, vendor_name: '' })
    expect(result.success).toBe(false)
  })
})
