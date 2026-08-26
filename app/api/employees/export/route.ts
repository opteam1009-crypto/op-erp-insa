import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { buildEmployeeWorkbook } from '@/lib/excel/employee-export'
import { getCurrentUser } from '@/lib/auth/current-user'
import type { Employee } from '@/lib/types'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const supabase = await createServerSupabase()
  const { data: employees } = await supabase.from('employees').select('*').order('employee_number')

  const buffer = buildEmployeeWorkbook((employees ?? []) as Employee[])

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="employees.xlsx"',
    },
  })
}
