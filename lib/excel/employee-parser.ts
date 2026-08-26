import * as XLSX from 'xlsx'
import { format } from 'date-fns'

export interface EmployeeRow {
  employee_number: string
  name: string
  department: string
  position: string
  employment_type: string
  hire_date: string
  birth_date: string
  phone: string
  emergency_contact: string
}

export interface EmployeeParseResult {
  rows: EmployeeRow[]
  errors: { row: number; message: string }[]
}

const REQUIRED_HEADERS = ['사번', '이름', '부서', '근로형태', '입사일'] as const

/**
 * A real Excel date cell is stored as a serial number (e.g. 45306.000601851854), which
 * would never match employeeSchema's YYYY-MM-DD regex. XLSX.read(..., { cellDates: true })
 * turns those cells into JS Date objects at local midnight, which we format back to
 * yyyy-MM-dd here. Cells that were plain text are passed through unchanged.
 */
function cellToString(value: unknown): string {
  if (value instanceof Date) return format(value, 'yyyy-MM-dd')
  if (value === null || value === undefined) return ''
  return String(value)
}

export function parseEmployeeExcel(buffer: ArrayBuffer): EmployeeParseResult {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })

  const errors: EmployeeParseResult['errors'] = []
  const rows: EmployeeRow[] = []

  json.forEach((raw, index) => {
    const missing = REQUIRED_HEADERS.filter((h) => !raw[h])
    if (missing.length > 0) {
      errors.push({ row: index + 2, message: `필수 항목 누락: ${missing.join(', ')}` })
      return
    }
    rows.push({
      employee_number: cellToString(raw['사번']),
      name: cellToString(raw['이름']),
      department: cellToString(raw['부서']),
      position: cellToString(raw['직급']),
      employment_type: cellToString(raw['근로형태']),
      hire_date: cellToString(raw['입사일']),
      birth_date: cellToString(raw['생년월일']),
      phone: cellToString(raw['연락처']),
      emergency_contact: cellToString(raw['비상연락망']),
    })
  })

  return { rows, errors }
}
