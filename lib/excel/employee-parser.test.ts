import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { parseEmployeeExcel } from './employee-parser'

function bufferFromRows(rows: Record<string, string>[]): ArrayBuffer {
  const sheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1')
  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
}

describe('parseEmployeeExcel', () => {
  it('parses valid rows', () => {
    const buffer = bufferFromRows([
      { 사번: 'E001', 이름: '홍길동', 부서: '기획운영팀', 직급: '매니저', 근로형태: '정규직', 입사일: '2024-01-15' },
    ])
    const result = parseEmployeeExcel(buffer)
    expect(result.errors).toHaveLength(0)
    expect(result.rows).toEqual([
      {
        employee_number: 'E001',
        name: '홍길동',
        department: '기획운영팀',
        position: '매니저',
        employment_type: '정규직',
        hire_date: '2024-01-15',
        birth_date: '',
        phone: '',
        emergency_contact: '',
      },
    ])
  })

  it('reports a row missing a required header', () => {
    const buffer = bufferFromRows([{ 사번: 'E002', 이름: '', 부서: '회계팀', 직급: '', 근로형태: '정규직', 입사일: '2024-02-01' }])
    const result = parseEmployeeExcel(buffer)
    expect(result.rows).toHaveLength(0)
    expect(result.errors).toEqual([{ row: 2, message: '필수 항목 누락: 이름' }])
  })
})
