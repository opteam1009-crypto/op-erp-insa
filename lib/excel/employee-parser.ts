import * as XLSX from 'xlsx'

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

export function parseEmployeeExcel(buffer: ArrayBuffer): EmployeeParseResult {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const json = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' })

  const errors: EmployeeParseResult['errors'] = []
  const rows: EmployeeRow[] = []

  json.forEach((raw, index) => {
    const missing = REQUIRED_HEADERS.filter((h) => !raw[h])
    if (missing.length > 0) {
      errors.push({ row: index + 2, message: `필수 항목 누락: ${missing.join(', ')}` })
      return
    }
    rows.push({
      employee_number: String(raw['사번']),
      name: String(raw['이름']),
      department: String(raw['부서']),
      position: String(raw['직급'] ?? ''),
      employment_type: String(raw['근로형태']),
      hire_date: String(raw['입사일']),
      birth_date: String(raw['생년월일'] ?? ''),
      phone: String(raw['연락처'] ?? ''),
      emergency_contact: String(raw['비상연락망'] ?? ''),
    })
  })

  return { rows, errors }
}
