import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { parseEmployeeExcel } from './employee-parser'

function bufferFromSheet(sheet: XLSX.WorkSheet): ArrayBuffer {
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1')
  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
}

function bufferFromRows(rows: Record<string, string>[]): ArrayBuffer {
  return bufferFromSheet(XLSX.utils.json_to_sheet(rows))
}

/**
 * json_to_sheet coerces everything to text, so it can't produce a real Excel date cell.
 * aoa_to_sheet keeps a Date object as a genuine date-formatted cell — which is what an
 * actual HR spreadsheet contains, and what used to come back as a raw serial number.
 */
function bufferFromAoa(rows: (string | Date)[][]): ArrayBuffer {
  return bufferFromSheet(XLSX.utils.aoa_to_sheet(rows))
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

  it('formats real Excel date cells as yyyy-MM-dd instead of leaking serial numbers', () => {
    const buffer = bufferFromAoa([
      ['사번', '이름', '부서', '직급', '근로형태', '입사일', '생년월일'],
      ['E003', '김철수', '개발팀', '팀장', '정규직', new Date(2024, 0, 15), new Date(1990, 11, 3)],
    ])

    const result = parseEmployeeExcel(buffer)

    expect(result.errors).toHaveLength(0)
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].hire_date).toBe('2024-01-15')
    expect(result.rows[0].birth_date).toBe('1990-12-03')
  })

  it('reports a row missing a required header', () => {
    const buffer = bufferFromRows([{ 사번: 'E002', 이름: '', 부서: '회계팀', 직급: '', 근로형태: '정규직', 입사일: '2024-02-01' }])
    const result = parseEmployeeExcel(buffer)
    expect(result.rows).toHaveLength(0)
    expect(result.errors).toEqual([{ row: 2, message: '필수 항목 누락: 이름' }])
  })
})
