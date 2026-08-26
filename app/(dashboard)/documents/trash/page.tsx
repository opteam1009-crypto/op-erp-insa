import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/current-user'
import { permissions } from '@/lib/auth/permissions'
import { TrashList } from './TrashList'

export default async function TrashPage() {
  const user = await requireUser()

  // Trash is admin-only: soft-deleted documents must not be visible to staff/viewer.
  if (!permissions.canDeleteDocuments(user.role)) {
    redirect('/documents')
  }

  return <TrashList />
}
