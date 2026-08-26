export interface ClassifiedDocument {
  transaction_type: '매출' | '매입'
  amount: number
  year: number
  month: number
  franchise_store_id: string | null
}

export interface PeriodTotals {
  totalSales: number
  totalPurchases: number
  netProfit: number
}

export function calculatePeriodTotals(
  documents: ClassifiedDocument[],
  year: number,
  month: number
): PeriodTotals {
  const inPeriod = documents.filter((d) => d.year === year && d.month === month)
  const totalSales = inPeriod
    .filter((d) => d.transaction_type === '매출')
    .reduce((sum, d) => sum + d.amount, 0)
  const totalPurchases = inPeriod
    .filter((d) => d.transaction_type === '매입')
    .reduce((sum, d) => sum + d.amount, 0)

  return { totalSales, totalPurchases, netProfit: totalSales - totalPurchases }
}

export interface FranchiseBalance {
  franchiseStoreId: string
  totalSales: number
  totalPurchases: number
  netBalance: number
}

/**
 * Cumulative (not period-scoped) net balance per franchise store: 미수금/미지급금
 * is a running balance-sheet concept, not a monthly flow, so this deliberately
 * ignores year/month and nets every classified document ever recorded for that store.
 */
export function calculateFranchiseBalances(documents: ClassifiedDocument[]): FranchiseBalance[] {
  const byStore = new Map<string, { totalSales: number; totalPurchases: number }>()

  for (const doc of documents) {
    if (!doc.franchise_store_id) continue
    const entry = byStore.get(doc.franchise_store_id) ?? { totalSales: 0, totalPurchases: 0 }
    if (doc.transaction_type === '매출') {
      entry.totalSales += doc.amount
    } else if (doc.transaction_type === '매입') {
      entry.totalPurchases += doc.amount
    }
    byStore.set(doc.franchise_store_id, entry)
  }

  return Array.from(byStore.entries()).map(([franchiseStoreId, { totalSales, totalPurchases }]) => ({
    franchiseStoreId,
    totalSales,
    totalPurchases,
    netBalance: totalSales - totalPurchases,
  }))
}
