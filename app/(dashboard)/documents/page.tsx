import Link from 'next/link'
import { createServerSupabase } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/current-user'
import { permissions } from '@/lib/auth/permissions'
import { DeleteButton } from './DeleteButton'
import { DocumentUploadModalButton } from './DocumentUploadModalButton'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Alert } from '@/components/ui/Alert'
import { Table, THead, TBody, TR, TH, TD, TableEmpty } from '@/components/ui/Table'
import { buttonClass } from '@/lib/ui/button-class'

export default async function DocumentsPage() {
  const user = await requireUser()
  const canUpload = permissions.canUploadDocuments(user.role)
  const canDelete = permissions.canDeleteDocuments(user.role)

  const supabase = await createServerSupabase()
  // 운영중 가맹점 목록은 업로드 모달의 셀렉트 옵션이다. 업로드 권한이 없으면
  // 모달 버튼 자체가 렌더링되지 않으므로 조회하지 않는다.
  const storesPromise = canUpload
    ? supabase.from('franchise_stores').select('id, name').eq('status', '운영중').order('name')
    : Promise.resolve({ data: [], error: null })

  const { data: documents, error: documentsError } = await supabase
    .from('documents')
    .select('*, franchise_stores(name)')
    .is('deleted_at', null)
    .order('year', { ascending: false })
    .order('month', { ascending: false })

  if (documentsError) {
    console.error('Failed to load documents:', documentsError)
    return <Alert variant="error">증빙 데이터를 불러오지 못했습니다. 관리자에게 문의하세요.</Alert>
  }

  const { data: franchiseStores } = await storesPromise

  const colSpan = canDelete ? 8 : 7

  return (
    <div>
      <PageHeader
        title="증빙 관리"
        description={`총 ${documents?.length ?? 0}건`}
        actions={
          <>
            {canDelete && (
              <Link href="/documents/trash" className={buttonClass('secondary')}>
                휴지통
              </Link>
            )}
            {canUpload && <DocumentUploadModalButton franchiseStores={franchiseStores ?? []} />}
          </>
        }
      />
      <Table>
        <THead>
          <TR>
            <TH>연/월</TH>
            <TH>유형</TH>
            <TH>거래처</TH>
            <TH>거래구분</TH>
            <TH align="right">금액</TH>
            <TH>가맹점</TH>
            <TH>파일</TH>
            {canDelete && <TH align="right" />}
          </TR>
        </THead>
        <TBody>
          {documents?.length ? (
            documents.map((doc) => (
              <TR key={doc.id}>
                <TD className="tnum whitespace-nowrap">
                  {doc.year}-{String(doc.month).padStart(2, '0')}
                </TD>
                <TD>{doc.doc_type}</TD>
                <TD>{doc.vendor_name ?? '-'}</TD>
                <TD>
                  <Badge status={doc.transaction_type}>{doc.transaction_type ?? '미분류'}</Badge>
                </TD>
                <TD align="right">
                  {doc.amount != null ? `${doc.amount.toLocaleString('ko-KR')}원` : '-'}
                </TD>
                <TD>{(doc.franchise_stores as unknown as { name: string } | null)?.name ?? '-'}</TD>
                <TD>
                  <span title={doc.file_name} className="block max-w-[220px] truncate">
                    {doc.file_name}
                  </span>
                </TD>
                {canDelete && (
                  <TD align="right">
                    <DeleteButton id={doc.id} />
                  </TD>
                )}
              </TR>
            ))
          ) : (
            <TableEmpty
              colSpan={colSpan}
              title="등록된 증빙이 없습니다"
              description={canUpload ? '증빙 업로드로 첫 자료를 추가하세요.' : undefined}
            />
          )}
        </TBody>
      </Table>
    </div>
  )
}
