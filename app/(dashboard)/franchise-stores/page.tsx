import { requireUser } from '@/lib/auth/current-user'
import { permissions } from '@/lib/auth/permissions'
import { createServerSupabase } from '@/lib/supabase/server'
import { CreateFranchiseStoreForm } from './CreateFranchiseStoreForm'
import { StatusToggleButton } from './StatusToggleButton'
import type { FranchiseStore } from '@/lib/types'

export default async function FranchiseStoresPage() {
  const user = await requireUser()
  const canManage = permissions.canManageFranchiseStores(user.role)

  const supabase = await createServerSupabase()
  const { data: stores } = await supabase
    .from('franchise_stores')
    .select('*')
    .order('name')

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">가맹점 관리</h1>
      {canManage && <CreateFranchiseStoreForm />}
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="p-2">가맹점명</th>
            <th className="p-2">상태</th>
            {canManage && <th className="p-2">관리</th>}
          </tr>
        </thead>
        <tbody>
          {(stores as FranchiseStore[] | null)?.map((store) => (
            <tr key={store.id} className="border-b">
              <td className="p-2">{store.name}</td>
              <td className="p-2">{store.status}</td>
              {canManage && (
                <td className="p-2">
                  <StatusToggleButton id={store.id} status={store.status} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
