import { requireUser } from '@/lib/auth/current-user'
import { permissions } from '@/lib/auth/permissions'
import { createServerSupabase } from '@/lib/supabase/server'
import { CreateFranchiseStoreForm } from './CreateFranchiseStoreForm'
import { StatusToggleButton } from './StatusToggleButton'
import type { FranchiseStore } from '@/lib/types'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Table, THead, TBody, TR, TH, TD, TableEmpty } from '@/components/ui/Table'

export default async function FranchiseStoresPage() {
  const user = await requireUser()
  const canManage = permissions.canManageFranchiseStores(user.role)

  const supabase = await createServerSupabase()
  const { data: stores } = await supabase
    .from('franchise_stores')
    .select('*')
    .order('name')

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
