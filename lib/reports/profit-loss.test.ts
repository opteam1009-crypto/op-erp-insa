import { describe, it, expect } from 'vitest'
import { calculatePeriodTotals, calculateFranchiseBalances, type ClassifiedDocument } from './profit-loss'

const docs: ClassifiedDocument[] = [
  { transaction_type: '매출', amount: 1000000, year: 2026, month: 8, franchise_store_id: 'store-a' },
  { transaction_type: '매입', amount: 300000, year: 2026, month: 8, franchise_store_id: 'store-a' },
  { transaction_type: '매출', amount: 500000, year: 2026, month: 8, franchise_store_id: 'store-b' },
  { transaction_type: '매입', amount: 800000, year: 2026, month: 8, franchise_store_id: null },
  { transaction_type: '매출', amount: 200000, year: 2026, month: 7, franchise_store_id: 'store-a' },
]

describe('calculatePeriodTotals', () => {
  it('sums sales and purchases for the given year/month only', () => {
    const result = calculatePeriodTotals(docs, 2026, 8)
    expect(result.totalSales).toBe(1500000)
    expect(result.totalPurchases).toBe(1100000)
    expect(result.netProfit).toBe(400000)
  })

  it('returns zeros for a period with no matching documents', () => {
    const result = calculatePeriodTotals(docs, 2026, 1)
    expect(result).toEqual({ totalSales: 0, totalPurchases: 0, netProfit: 0 })
  })
})

describe('calculateFranchiseBalances', () => {
  it('nets sales minus purchases per franchise store across all periods', () => {
    const result = calculateFranchiseBalances(docs)
    expect(result).toEqual(
      expect.arrayContaining([
        { franchiseStoreId: 'store-a', totalSales: 1200000, totalPurchases: 300000, netBalance: 900000 },
        { franchiseStoreId: 'store-b', totalSales: 500000, totalPurchases: 0, netBalance: 500000 },
      ])
    )
  })

  it('excludes documents with no franchise_store_id', () => {
    const result = calculateFranchiseBalances(docs)
    expect(result).toHaveLength(2)
  })

  it('ignores documents with an unclassified transaction_type instead of booking them as 매입', () => {
    const docsWithBadData: ClassifiedDocument[] = [
      ...docs,
      {
        transaction_type: null,
        amount: 999999,
        year: 2026,
        month: 8,
        franchise_store_id: 'store-a',
      } as unknown as ClassifiedDocument,
    ]
    const result = calculateFranchiseBalances(docsWithBadData)
    expect(result).toEqual(
      expect.arrayContaining([
        { franchiseStoreId: 'store-a', totalSales: 1200000, totalPurchases: 300000, netBalance: 900000 },
      ])
    )
  })
})
