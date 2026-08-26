import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/current-user'
import { permissions } from '@/lib/auth/permissions'
import { DocumentUploadForm } from './DocumentUploadForm'

export default async function DocumentUploadPage() {
  const user = await requireUser()

  if (!permissions.canUploadDocuments(user.role)) {
    redirect('/employees')
  }

  return <DocumentUploadForm />
}
