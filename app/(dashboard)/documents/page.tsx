import Link from 'next/link'
import { createServerSupabase } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/current-user'
import { permissions } from '@/lib/auth/permissions'
import { DeleteButton } from './DeleteButton'

export default async function DocumentsPage() {
  const user = await requireUser()
  const canUpload = permissions.canUploadDocuments(user.role)
  const canDelete = permissions.canDeleteDocuments(user.role)

  const supabase = await createServerSupabase()
  const { data: documents } = await supabase
    .from('documents')
    .select('*, franchise_stores(name)')
    .is('deleted_at', null)
    .order('year', { ascending: false })
    .order('month', { ascending: false })

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">증빙 관리</h1>
        <div className="flex gap-3">
          {canUpload && (
            <Link href="/documents/upload" className="rounded bg-black px-4 py-2 text-white">+ 증빙 업로드</Link>
          )}
          {canDelete && (
            <Link href="/documents/trash" className="rounded border px-4 py-2">휴지통</Link>
          )}
        </div>
      </div>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="p-2">연/월</th>
            <th className="p-2">유형</th>
            <th className="p-2">거래처</th>
            <th className="p-2">거래구분</th>
            <th className="p-2">금액</th>
            <th className="p-2">가맹점</th>
            <th className="p-2">파일</th>
            <th className="p-2"></th>
          </tr>
        </thead>
        <tbody>
          {documents?.map((doc) => (
            <tr key={doc.id} className="border-b">
              <td className="p-2">{doc.year}-{String(doc.month).padStart(2, '0')}</td>
              <td className="p-2">{doc.doc_type}</td>
              <td className="p-2">{doc.vendor_name ?? '-'}</td>
              <td className="p-2">{doc.transaction_type ?? '미분류'}</td>
              <td className="p-2">{doc.amount != null ? doc.amount.toLocaleString('ko-KR') : '-'}</td>
              <td className="p-2">{(doc.franchise_stores as unknown as { name: string } | null)?.name ?? '-'}</td>
              <td className="p-2">{doc.file_name}</td>
              <td className="p-2">
                {canDelete && <DeleteButton id={doc.id} />}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
