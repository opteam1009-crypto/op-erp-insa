import { sql } from '@/lib/db/sql'
import { PageHeader } from '@/components/ui/PageHeader'
import { DocumentUploadForm, type FranchiseStoreOption } from './DocumentUploadForm'

export default async function DocumentUploadPage() {
  const franchiseStores = (await sql`
    select id, name from franchise_stores where status = '운영중' order by name
  `) as FranchiseStoreOption[]

  // 제목은 폼이 아니라 여기서 그린다 — 같은 폼이 모달에서도 쓰이고,
  // 거기서는 모달 제목이 그 역할을 한다.
  return (
    <div className="max-w-2xl">
      <PageHeader title="증빙 업로드" />
      <DocumentUploadForm franchiseStores={franchiseStores} />
    </div>
  )
}
