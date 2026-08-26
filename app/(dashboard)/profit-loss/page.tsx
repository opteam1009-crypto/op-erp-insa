import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/current-user'
import { permissions } from '@/lib/auth/permissions'
import { createServerSupabase } from '@/lib/supabase/server'
import { calculatePeriodTotals, calculateFranchiseBalances, type ClassifiedDocument } from '@/lib/reports/profit-loss'

export default async function ProfitLossPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>
}) {
  const user = await requireUser()
  if (!permissions.canViewProfitLoss(user.role)) {
    redirect('/employees')
  }

  const now = new Date()
  const { year: yearParam, month: monthParam } = await searchParams
  const year = Number(yearParam) || now.getFullYear()
  const month = Number(monthParam) || now.getMonth() + 1

  const supabase = await createServerSupabase()
  const [{ data: documents }, { data: franchiseStores }] = await Promise.all([
    supabase
      .from('documents')
      .select('transaction_type, amount, year, month, franchise_store_id')
      .is('deleted_at', null)
      .not('transaction_type', 'is', null),
    supabase.from('franchise_stores').select('id, name'),
  ])

  const classified = (documents ?? []) as ClassifiedDocument[]
  const periodTotals = calculatePeriodTotals(classified, year, month)
  const franchiseBalances = calculateFranchiseBalances(classified)
  const storeNameById = new Map((franchiseStores ?? []).map((s) => [s.id, s.name]))

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="mb-4 text-xl font-bold">손익 정산</h1>
        <form className="mb-4 flex items-end gap-2">
          <label className="text-sm">
            연도
            <input type="number" name="year" defaultValue={year} className="block w-24 border p-2" />
          </label>
          <label className="text-sm">
            월
            <input type="number" name="month" min={1} max={12} defaultValue={month} className="block w-20 border p-2" />
          </label>
          <button type="submit" className="rounded bg-black px-4 py-2 text-white">조회</button>
        </form>
        <table className="w-full border-collapse text-sm">
          <tbody>
            <tr className="border-b">
              <td className="p-2 font-semibold">{year}년 {month}월 매출 합계</td>
              <td className="p-2 text-right">{periodTotals.totalSales.toLocaleString('ko-KR')}원</td>
            </tr>
            <tr className="border-b">
              <td className="p-2 font-semibold">{year}년 {month}월 매입 합계</td>
              <td className="p-2 text-right">{periodTotals.totalPurchases.toLocaleString('ko-KR')}원</td>
            </tr>
            <tr className="border-b">
              <td className="p-2 font-semibold">순손익</td>
              <td className="p-2 text-right">{periodTotals.netProfit.toLocaleString('ko-KR')}원</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="mb-2 text-lg font-bold">가맹점별 누적 잔액 (미수금/미지급금)</h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="p-2">가맹점</th>
              <th className="p-2 text-right">매출 누계</th>
              <th className="p-2 text-right">매입 누계</th>
              <th className="p-2 text-right">순잔액</th>
            </tr>
          </thead>
          <tbody>
            {franchiseBalances.map((balance) => (
              <tr key={balance.franchiseStoreId} className="border-b">
                <td className="p-2">{storeNameById.get(balance.franchiseStoreId) ?? '-'}</td>
                <td className="p-2 text-right">{balance.totalSales.toLocaleString('ko-KR')}원</td>
                <td className="p-2 text-right">{balance.totalPurchases.toLocaleString('ko-KR')}원</td>
                <td className="p-2 text-right">
                  {balance.netBalance >= 0
                    ? `미수금 ${balance.netBalance.toLocaleString('ko-KR')}원`
                    : `미지급금 ${Math.abs(balance.netBalance).toLocaleString('ko-KR')}원`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
