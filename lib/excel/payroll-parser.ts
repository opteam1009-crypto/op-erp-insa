import * as XLSX from 'xlsx'

export interface PayrollParseResult {
  status: 'parsed' | 'fallback'
  data: Record<string, string | number>[] | null
}

const EXPECTED_HEADERS = ['성명', '기본급', '실수령액']

export function parsePayrollExcel(buffer: ArrayBuffer): PayrollParseResult {
  try {
    const workbook = XLSX.read(buffer, { type: 'array' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const json = XLSX.utils.sheet_to_json<Record<string, string | number>>(sheet, { defval: '' })

    if (json.length === 0) {
      return { status: 'fallback', data: null }
    }

    const headers = Object.keys(json[0])
    const hasExpectedHeaders = EXPECTED_HEADERS.every((h) => headers.includes(h))

    if (!hasExpectedHeaders) {
      return { status: 'fallback', data: null }
    }

    return { status: 'parsed', data: json }
  } catch {
    return { status: 'fallback', data: null }
  }
}
