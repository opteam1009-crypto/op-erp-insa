import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/current-user'
import { permissions } from '@/lib/auth/permissions'
import { createServerSupabase } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/PageHeader'
import { DocumentUploadForm } from './DocumentUploadForm'

export default async function DocumentUploadPage() {
  const user = await requireUser()

  if (!permissions.canUploadDocuments(user.role)) {
    redirect('/employees')
  }

  const supabase = await createServerSupabase()
  const { data: franchiseStores } = await supabase
    .from('franchise_stores')
    .select('id, name')
    .eq('status', '운영중')
    .order('name')

  // 제목은 폼이 아니라 여기서 그린다 — 같은 폼이 모달에서도 쓰이고,
  // 거기서는 모달 제목이 그 역할을 한다.
  return (
    <div className="max-w-2xl">
      <PageHeader title="증빙 업로드" />
      <DocumentUploadForm franchiseStores={franchiseStores ?? []} />
    </div>
  )
}
