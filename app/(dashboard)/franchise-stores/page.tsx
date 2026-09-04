import { sql } from '@/lib/db/sql'
import { CreateFranchiseStoreForm } from './CreateFranchiseStoreForm'
import { StatusToggleButton } from './StatusToggleButton'
import type { FranchiseStore } from '@/lib/types'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Table, THead, TBody, TR, TH, TD, TableEmpty } from '@/components/ui/Table'
import { Alert } from '@/components/ui/Alert'

export default async function FranchiseStoresPage() {
  let rows: FranchiseStore[]

  try {
    rows = (await sql`select * from franchise_stores order by name`) as FranchiseStore[]
  } catch (error) {
    // 조회 실패를 빈 목록으로 흘려보내면 "등록된 가맹점이 없습니다"라는 빈 상태가
    // 떠서, 데이터가 없는 것과 못 불러온 것을 구분할 수 없게 된다.
    console.error('Failed to load franchise stores:', error)
    return <Alert variant="error">가맹점 목록을 불러오지 못했습니다. 관리자에게 문의하세요.</Alert>
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title="가맹점 관리" description={`총 ${rows.length}곳`} />
      <CreateFranchiseStoreForm />
      <Table>
        <THead>
          <TR>
            <TH>가맹점명</TH>
            <TH>상태</TH>
            <TH align="right">관리</TH>
          </TR>
        </THead>
        <TBody>
          {rows.length ? (
            rows.map((store) => (
              <TR key={store.id}>
                <TD>{store.name}</TD>
                <TD>
                  <Badge status={store.status}>{store.status}</Badge>
                </TD>
                <TD align="right">
                  <StatusToggleButton id={store.id} status={store.status} />
                </TD>
              </TR>
            ))
          ) : (
            <TableEmpty
              colSpan={3}
              title="등록된 가맹점이 없습니다"
              description="위 입력창에서 가맹점을 추가하세요."
            />
          )}
        </TBody>
      </Table>
    </div>
  )
}
