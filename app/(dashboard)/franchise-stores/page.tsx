import { requireUser } from '@/lib/auth/current-user'
import { permissions } from '@/lib/auth/permissions'
import { createServerSupabase } from '@/lib/supabase/server'
import { CreateFranchiseStoreForm } from './CreateFranchiseStoreForm'
import { StatusToggleButton } from './StatusToggleButton'
import type { FranchiseStore } from '@/lib/types'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Table, THead, TBody, TR, TH, TD, TableEmpty } from '@/components/ui/Table'
import { Alert } from '@/components/ui/Alert'

export default async function FranchiseStoresPage() {
  const user = await requireUser()
  const canManage = permissions.canManageFranchiseStores(user.role)

  const supabase = await createServerSupabase()
  const { data: stores, error: storesError } = await supabase
    .from('franchise_stores')
    .select('*')
    .order('name')

  // 조회 실패를 빈 목록으로 흘려보내면 "등록된 가맹점이 없습니다"라는 빈 상태가
  // 떠서, 데이터가 없는 것과 못 불러온 것을 구분할 수 없게 된다.
  if (storesError) {
    console.error('Failed to load franchise stores:', storesError)
    return <Alert variant="error">가맹점 목록을 불러오지 못했습니다. 관리자에게 문의하세요.</Alert>
  }

  const rows = stores as FranchiseStore[] | null

  return (
    <div className="max-w-3xl">
      <PageHeader title="가맹점 관리" description={`총 ${rows?.length ?? 0}곳`} />
      {canManage && <CreateFranchiseStoreForm />}
      <Table>
        <THead>
          <TR>
            <TH>가맹점명</TH>
            <TH>상태</TH>
            {canManage && <TH align="right">관리</TH>}
          </TR>
        </THead>
        <TBody>
          {rows?.length ? (
            rows.map((store) => (
              <TR key={store.id}>
                <TD>{store.name}</TD>
                <TD>
                  <Badge status={store.status}>{store.status}</Badge>
                </TD>
                {canManage && (
                  <TD align="right">
                    <StatusToggleButton id={store.id} status={store.status} />
                  </TD>
                )}
              </TR>
            ))
          ) : (
            <TableEmpty
              colSpan={canManage ? 3 : 2}
              title="등록된 가맹점이 없습니다"
              description={canManage ? '위 입력창에서 가맹점을 추가하세요.' : undefined}
            />
          )}
        </TBody>
      </Table>
    </div>
  )
}
