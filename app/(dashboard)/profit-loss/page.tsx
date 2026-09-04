import { sql } from '@/lib/db/sql'
import {
  calculatePeriodTotals,
  calculateFranchiseBalances,
  type ClassifiedDocument,
} from '@/lib/reports/profit-loss'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { Card, CardBody } from '@/components/ui/Card'
import { Table, THead, TBody, TR, TH, TD, TableEmpty } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Field, Input } from '@/components/ui/Field'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'

const won = (value: number) => `${value.toLocaleString('ko-KR')}원`

export default async function ProfitLossPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>
}) {
  const now = new Date()
  const { year: yearParam, month: monthParam } = await searchParams
  const year = Number(yearParam) || now.getFullYear()
  const month = Number(monthParam) || now.getMonth() + 1

  let classified: ClassifiedDocument[]
  let storeNameById: Map<string, string>

  try {
    const [documentRows, storeRows] = await Promise.all([
      sql`
        select transaction_type, amount, year, month, franchise_store_id
        from documents
        where deleted_at is null and transaction_type is not null
      `,
      sql`select id, name from franchise_stores`,
    ])

    // numeric 컬럼은 드라이버가 문자열로 돌려준다. 계산 함수는 숫자를 기대하므로
    // 여기서 바꾼다 — 안 바꾸면 합계가 문자열 이어붙이기가 된다.
    classified = (documentRows as { amount: string | null }[]).map((row) => ({
      ...row,
      amount: row.amount == null ? null : Number(row.amount),
    })) as ClassifiedDocument[]

    storeNameById = new Map(
      (storeRows as { id: string; name: string }[]).map((s) => [s.id, s.name])
    )
  } catch (error) {
    console.error('Failed to load profit-loss data:', error)
    return <Alert variant="error">손익 데이터를 불러오지 못했습니다. 관리자에게 문의하세요.</Alert>
  }

  const periodTotals = calculatePeriodTotals(classified, year, month)
  const franchiseBalances = calculateFranchiseBalances(classified)

  return (
    <div className="max-w-5xl">
      <PageHeader title="손익 정산" description={`${year}년 ${month}월 기준`} />

      <div className="flex flex-col gap-4">
        <Card>
          <CardBody padding="snug">
            <form className="flex flex-wrap items-end gap-3">
              <Field label="연도" htmlFor="year" className="w-28">
                <Input id="year" type="number" name="year" defaultValue={year} />
              </Field>
              <Field label="월" htmlFor="month" className="w-24">
                <Input id="month" type="number" name="month" min={1} max={12} defaultValue={month} />
              </Field>
              <Button type="submit" variant="secondary">
                조회
              </Button>
            </form>
          </CardBody>
        </Card>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard label="매출 합계" value={won(periodTotals.totalSales)} hint={`${year}년 ${month}월`} />
          <StatCard label="매입 합계" value={won(periodTotals.totalPurchases)} hint={`${year}년 ${month}월`} />
          <StatCard
            label="순손익"
            value={won(periodTotals.netProfit)}
            tone={periodTotals.netProfit < 0 ? 'negative' : 'positive'}
            hint={`${year}년 ${month}월`}
          />
        </div>

        <section>
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <h2 className="text-[15px] font-semibold text-fg">가맹점별 누적 잔액</h2>
            <span className="text-[12px] text-fg-subtle">미수금 / 미지급금</span>
          </div>
          <Table>
            <THead>
              <TR>
                <TH>가맹점</TH>
                <TH align="right">매출 누계</TH>
                <TH align="right">매입 누계</TH>
                <TH align="right">순잔액</TH>
              </TR>
            </THead>
            <TBody>
              {franchiseBalances.length ? (
                franchiseBalances.map((balance) => {
                  const owed = balance.netBalance >= 0
                  const label = owed ? '미수금' : '미지급금'
                  return (
                    <TR key={balance.franchiseStoreId}>
                      <TD>{storeNameById.get(balance.franchiseStoreId) ?? '-'}</TD>
                      <TD align="right">{won(balance.totalSales)}</TD>
                      <TD align="right">{won(balance.totalPurchases)}</TD>
                      <TD align="right">
                        <span className="inline-flex items-center justify-end gap-2">
                          <Badge status={label}>{label}</Badge>
                          <span className="tnum">{won(Math.abs(balance.netBalance))}</span>
                        </span>
                      </TD>
                    </TR>
                  )
                })
              ) : (
                <TableEmpty colSpan={4} title="집계할 거래가 없습니다" />
              )}
            </TBody>
          </Table>
        </section>
      </div>
    </div>
  )
}
