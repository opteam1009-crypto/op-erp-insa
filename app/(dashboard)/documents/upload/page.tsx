import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/current-user'
import { permissions } from '@/lib/auth/permissions'
import { createServerSupabase } from '@/lib/supabase/server'
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

  return <DocumentUploadForm franchiseStores={franchiseStores ?? []} />
}
