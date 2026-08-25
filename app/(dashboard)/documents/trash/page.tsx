'use client'

import { useEffect, useState } from 'react'
import { createBrowserSupabase } from '@/lib/supabase/client'
import { isPurgeable } from '@/lib/documents/trash'
import type { DocumentRecord } from '@/lib/types'

export default function TrashPage() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([])

  useEffect(() => {
    const supabase = createBrowserSupabase()
    supabase
      .from('documents')
      .select('*')
      .not('deleted_at', 'is', null)
      .then(({ data }) => setDocuments((data ?? []) as DocumentRecord[]))
  }, [])

  async function restore(id: string) {
    await fetch(`/api/documents/${id}/restore`, { method: 'POST' })
    setDocuments((docs) => docs.filter((d) => d.id !== id))
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">휴지통 (30일 후 영구 삭제)</h1>
      <ul className="space-y-2">
        {documents.map((doc) => (
          <li key={doc.id} className="flex items-center justify-between border-b p-2">
            <span>{doc.file_name} ({doc.doc_type}, 삭제일: {doc.deleted_at})</span>
            {!isPurgeable(doc.deleted_at, new Date()) && (
              <button onClick={() => restore(doc.id)} className="text-blue-600">복원</button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
