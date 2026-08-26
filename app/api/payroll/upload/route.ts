import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { parsePayrollExcel } from '@/lib/excel/payroll-parser'
import { getCurrentUser } from '@/lib/auth/current-user'
import { permissions } from '@/lib/auth/permissions'
import { ALLOWED_UPLOAD_MIME_TYPES, MAX_FILE_SIZE_BYTES } from '@/lib/validation/upload'

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!permissions.canViewPayroll(user.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const supabase = await createServerSupabase()

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const employeeId = formData.get('employee_id') as string | null
  const period = formData.get('period') as string | null

  if (!file || !employeeId || !period) {
    return NextResponse.json({ error: 'file, employee_id, period are required' }, { status: 400 })
  }

  // Same limits the 증빙 upload route enforces — checked before any parsing/Storage work.
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json({ error: '파일이 20MB를 초과합니다' }, { status: 400 })
  }
  if (!ALLOWED_UPLOAD_MIME_TYPES.includes(file.type)) {
    return NextResponse.json({ error: '허용되지 않는 파일 형식입니다' }, { status: 400 })
  }

  const buffer = await file.arrayBuffer()
  const { status, data } = parsePayrollExcel(buffer)

  const filePath = `${employeeId}/${period}-${file.name}`
  const { error: uploadError } = await supabase.storage.from('payroll').upload(filePath, buffer, {
    contentType: file.type,
    upsert: true,
  })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { error: insertError } = await supabase.from('payroll_records').upsert({
    employee_id: employeeId,
    period,
    file_path: filePath,
    file_name: file.name,
    parsed_data: data,
    parse_status: status,
    uploaded_by: user.userId,
  }, { onConflict: 'employee_id,period' })

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ status })
}
