import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { parsePayrollExcel } from './payroll-parser'

function bufferFromRows(rows: Record<string, string | number>[]): ArrayBuffer {
  const sheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1')
  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
}

describe('parsePayrollExcel', () => {
  it('parses when expected headers are present', () => {
    const buffer = bufferFromRows([{ 성명: '홍길동', 기본급: 3000000, 실수령액: 2700000 }])
    const result = parsePayrollExcel(buffer)
    expect(result.status).toBe('parsed')
    expect(result.data?.[0]['성명']).toBe('홍길동')
  })

  it('falls back when headers do not match', () => {
    const buffer = bufferFromRows([{ Name: '홍길동', Salary: 3000000 }])
    const result = parsePayrollExcel(buffer)
    expect(result.status).toBe('fallback')
    expect(result.data).toBeNull()
  })

  it('falls back on an empty sheet instead of throwing', () => {
    const buffer = bufferFromRows([])
    const result = parsePayrollExcel(buffer)
    expect(result.status).toBe('fallback')
  })
})
