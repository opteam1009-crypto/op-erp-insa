import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/current-user'
import { permissions } from '@/lib/auth/permissions'
import { BulkUploadForm } from './BulkUploadForm'

export default async function BulkUploadPage() {
  const user = await requireUser()

  if (!permissions.canManageEmployees(user.role)) {
    redirect('/employees')
  }

  return <BulkUploadForm />
}
