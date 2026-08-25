import * as XLSX from 'xlsx'
import type { Employee } from '@/lib/types'

export function buildEmployeeWorkbook(employees: Employee[]): ArrayBuffer {
  const rows = employees.map((e) => ({
    사번: e.employee_number,
    이름: e.name,
    직급: e.position ?? '',
    근로형태: e.employment_type,
    입사일: e.hire_date,
    재직상태: e.status,
  }))

  const sheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, '사원목록')
  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
}
