import Link from 'next/link'
import { sql } from '@/lib/db/sql'
import { DeleteButton } from './DeleteButton'
import { DocumentUploadModalButton } from './DocumentUploadModalButton'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Alert } from '@/components/ui/Alert'
import { Table, THead, TBody, TR, TH, TD, TableEmpty } from '@/components/ui/Table'
import { buttonClass } from '@/lib/ui/button-class'
import type { FranchiseStoreOption } from './upload/DocumentUploadForm'

interface DocumentListRow {
  id: string
  doc_type: string
  year: number
  month: number
  vendor_name: string | null
  transaction_type: string | null
  /** numeric 컬럼은 드라이버가 문자열로 돌려준다. 표시 직전에 Number로 바꾼다. */
  amount: string | null
  file_name: string
  store_name: string | null
}

export default async function DocumentsPage() {
  let documents: DocumentListRow[]
  let franchiseStores: FranchiseStoreOption[]

  try {
    // 운영중 가맹점 목록은 업로드 모달의 셀렉트 옵션이다.
    const [documentRows, storeRows] = await Promise.all([
      sql`
        select d.id, d.doc_type, d.year, d.month, d.vendor_name,
               d.transaction_type, d.amount, d.file_name,
               f.name as store_name
        from documents d
        left join franchise_stores f on f.id = d.franchise_store_id
        where d.deleted_at is null
        order by d.year desc, d.month desc
      `,
      sql`select id, name from franchise_stores where status = '운영중' order by name`,
    ])
    documents = documentRows as DocumentListRow[]
    franchiseStores = storeRows as FranchiseStoreOption[]
  } catch (error) {
    console.error('Failed to load documents:', error)
    return <Alert variant="error">증빙 데이터를 불러오지 못했습니다. 관리자에게 문의하세요.</Alert>
  }

  return (
    <div>
      <PageHeader
        title="증빙 관리"
        description={`총 ${documents.length}건`}
        actions={
          <>
            <Link href="/documents/trash" className={buttonClass('secondary')}>
              휴지통
            </Link>
            <DocumentUploadModalButton franchiseStores={franchiseStores} />
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
            <TH align="right" />
          </TR>
        </THead>
        <TBody>
          {documents.length ? (
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
                  {doc.amount != null ? `${Number(doc.amount).toLocaleString('ko-KR')}원` : '-'}
                </TD>
                <TD>{doc.store_name ?? '-'}</TD>
                <TD>
                  <span title={doc.file_name} className="block max-w-[220px] truncate">
                    {doc.file_name}
                  </span>
                </TD>
                <TD align="right">
                  <DeleteButton id={doc.id} />
                </TD>
              </TR>
            ))
          ) : (
            <TableEmpty
              colSpan={8}
              title="등록된 증빙이 없습니다"
              description="증빙 업로드로 첫 자료를 추가하세요."
            />
          )}
        </TBody>
      </Table>
    </div>
  )
}
