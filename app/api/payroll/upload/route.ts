import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { parsePayrollExcel } from '@/lib/excel/payroll-parser'
import { permissions } from '@/lib/auth/permissions'
import type { Role } from '@/lib/types'

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', auth.user.id).single()
  if (!profile || !permissions.canViewPayroll(profile.role as Role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const employeeId = formData.get('employee_id') as string | null
  const period = formData.get('period') as string | null

  if (!file || !employeeId || !period) {
    return NextResponse.json({ error: 'file, employee_id, period are required' }, { status: 400 })
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
    uploaded_by: auth.user.id,
  }, { onConflict: 'employee_id,period' })

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ status })
}
