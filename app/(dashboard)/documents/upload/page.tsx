import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { permissions } from '@/lib/auth/permissions'
import type { Role } from '@/lib/types'
import { DocumentUploadForm } from './DocumentUploadForm'

export default async function DocumentUploadPage() {
  const supabase = await createServerSupabase()
  const { data: auth } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', auth.user!.id).single()

  if (!profile || !permissions.canUploadDocuments(profile.role as Role)) {
    redirect('/employees')
  }

  return <DocumentUploadForm />
}
