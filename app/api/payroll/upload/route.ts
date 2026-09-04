import { NextResponse, type NextRequest } from 'next/server'
import { sql } from '@/lib/db/sql'
import { storeFile } from '@/lib/storage/blob'
import { parsePayrollExcel } from '@/lib/excel/payroll-parser'
import { isSignedIn } from '@/lib/auth/current-user'
import { ALLOWED_UPLOAD_MIME_TYPES, MAX_FILE_SIZE_BYTES } from '@/lib/validation/upload'

export async function POST(request: NextRequest) {
  if (!(await isSignedIn())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const employeeId = formData.get('employee_id') as string | null
  const period = formData.get('period') as string | null

  if (!file || !employeeId || !period) {
    return NextResponse.json({ error: 'file, employee_id, period are required' }, { status: 400 })
  }

  // 증빙 업로드와 같은 한도. 파싱이나 저장 전에 먼저 막는다.
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json({ error: '파일이 20MB를 초과합니다' }, { status: 400 })
  }
  if (!ALLOWED_UPLOAD_MIME_TYPES.includes(file.type)) {
    return NextResponse.json({ error: '허용되지 않는 파일 형식입니다' }, { status: 400 })
  }

  const buffer = await file.arrayBuffer()
  const { status, data } = parsePayrollExcel(buffer)

  let stored
  try {
    stored = await storeFile('payroll', `${employeeId}/${period}-${file.name}`, buffer, file.type)
  } catch (error) {
    console.error('Failed to store payroll file:', error)
    return NextResponse.json({ error: '파일 저장에 실패했습니다' }, { status: 500 })
  }

  try {
    // 같은 사원·같은 월을 다시 올리면 최신 파일로 교체한다.
    await sql`
      insert into payroll_records (employee_id, period, file_path, file_name, parsed_data, parse_status)
      values (${employeeId}, ${period}, ${stored.pathname}, ${file.name},
              ${data === null ? null : JSON.stringify(data)}, ${status})
      on conflict (employee_id, period) do update set
        file_path = excluded.file_path,
        file_name = excluded.file_name,
        parsed_data = excluded.parsed_data,
        parse_status = excluded.parse_status
    `
  } catch (error) {
    console.error('Failed to record payroll:', error)
    return NextResponse.json({ error: '저장에 실패했습니다' }, { status: 500 })
  }

  return NextResponse.json({ status })
}
