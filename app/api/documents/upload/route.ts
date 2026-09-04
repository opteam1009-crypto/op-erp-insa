import { NextResponse, type NextRequest } from 'next/server'
import { sql } from '@/lib/db/sql'
import { storeFile } from '@/lib/storage/blob'
import { documentMetaSchema, MAX_FILE_SIZE_BYTES, ALLOWED_MIME_TYPES } from '@/lib/validation/document'
import { isSignedIn } from '@/lib/auth/current-user'

export async function POST(request: NextRequest) {
  if (!(await isSignedIn())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) return NextResponse.json({ error: 'no file' }, { status: 400 })
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json({ error: '파일이 20MB를 초과합니다' }, { status: 400 })
  }
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json({ error: '허용되지 않는 파일 형식입니다' }, { status: 400 })
  }

  const franchiseStoreId = formData.get('franchise_store_id')

  const parsed = documentMetaSchema.safeParse({
    doc_type: formData.get('doc_type'),
    year: Number(formData.get('year')),
    month: Number(formData.get('month')),
    vendor_name: formData.get('vendor_name') || undefined,
    transaction_type: formData.get('transaction_type'),
    amount: Number(formData.get('amount')),
    franchise_store_id: franchiseStoreId ? String(franchiseStoreId) : null,
  })

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues.map((i) => i.message).join(', ') }, { status: 400 })
  }

  const d = parsed.data
  const buffer = await file.arrayBuffer()

  let stored
  try {
    stored = await storeFile('document', `${d.year}/${d.month}/${file.name}`, buffer, file.type)
  } catch (error) {
    console.error('Failed to store document file:', error)
    return NextResponse.json({ error: '파일 저장에 실패했습니다' }, { status: 500 })
  }

  try {
    await sql`
      insert into documents (
        doc_type, year, month, vendor_name, transaction_type, amount,
        franchise_store_id, file_path, file_name, file_size
      ) values (
        ${d.doc_type}, ${d.year}, ${d.month}, ${d.vendor_name ?? null},
        ${d.transaction_type}, ${d.amount}, ${d.franchise_store_id},
        ${stored.pathname}, ${file.name}, ${file.size}
      )
    `
  } catch (error) {
    console.error('Failed to record document:', error)
    return NextResponse.json({ error: '저장에 실패했습니다' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
