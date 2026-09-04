'use client'

import { useState } from 'react'
import { isPurgeable } from '@/lib/documents/trash'
import type { DocumentRecord } from '@/lib/types'
import { PageHeader } from '@/components/ui/PageHeader'
import { Table, THead, TBody, TR, TH, TD, TableEmpty } from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'

/**
 * 목록은 서버 컴포넌트가 읽어 props로 내려준다 — Neon에는 브라우저에서 붙을
 * 방법이 없다. 복원은 여전히 라우트 핸들러를 부르고, 결과를 기다리지 않고
 * 화면에서 먼저 지운다.
 */
export function TrashList({ documents: initial }: { documents: DocumentRecord[] }) {
  const [documents, setDocuments] = useState<DocumentRecord[]>(initial)

  async function restore(id: string) {
    await fetch(`/api/documents/${id}/restore`, { method: 'POST' })
    setDocuments((docs) => docs.filter((d) => d.id !== id))
  }

  const now = new Date()

  return (
    <div className="max-w-3xl">
      <PageHeader title="휴지통" description="삭제 후 30일이 지나면 영구 삭제됩니다." />
      <Table>
        <THead>
          <TR>
            <TH>파일</TH>
            <TH>유형</TH>
            <TH>삭제일</TH>
            <TH align="right">관리</TH>
          </TR>
        </THead>
        <TBody>
          {documents.length ? (
            documents.map((doc) => (
              <TR key={doc.id}>
                <TD>
                  <span title={doc.file_name} className="block max-w-[260px] truncate">
                    {doc.file_name}
                  </span>
                </TD>
                <TD>{doc.doc_type}</TD>
                <TD className="tnum whitespace-nowrap">{doc.deleted_at}</TD>
                <TD align="right">
                  {isPurgeable(doc.deleted_at, now) ? (
                    <span className="text-[12px] text-fg-subtle">복원 불가</span>
                  ) : (
                    <Button type="button" variant="secondary" size="sm" onClick={() => restore(doc.id)}>
                      복원
                    </Button>
                  )}
                </TD>
              </TR>
            ))
          ) : (
            <TableEmpty colSpan={4} title="휴지통이 비어 있습니다" />
          )}
        </TBody>
      </Table>
    </div>
  )
}
