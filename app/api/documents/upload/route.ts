import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { documentMetaSchema, MAX_FILE_SIZE_BYTES, ALLOWED_MIME_TYPES } from '@/lib/validation/document'
import { getCurrentUser } from '@/lib/auth/current-user'
import { permissions } from '@/lib/auth/permissions'

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!permissions.canUploadDocuments(user.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const supabase = await createServerSupabase()

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

  const filePath = `${parsed.data.year}/${parsed.data.month}/${Date.now()}-${file.name}`
  const buffer = await file.arrayBuffer()

  const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, buffer, {
    contentType: file.type,
  })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { error: insertError } = await supabase.from('documents').insert({
    ...parsed.data,
    file_path: filePath,
    file_name: file.name,
    file_size: file.size,
    uploaded_by: user.userId,
  })

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
