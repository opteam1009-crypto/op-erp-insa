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
        resignation_date: '',
        status: '재직',
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

describe('parseEmployeeExcel — 기존 인사대장 형식', () => {
  it('소속부서/계약형태 같은 별칭 헤더를 읽는다', () => {
    const buffer = bufferFromRows([
      { 이름: '변정득', 소속부서: '회계팀', 직급: '차장', 계약형태: '정규직', 입사일: '2020-11-17' },
    ])
    const result = parseEmployeeExcel(buffer)
    expect(result.errors).toHaveLength(0)
    expect(result.rows[0]).toMatchObject({
      name: '변정득',
      department: '회계팀',
      employment_type: '정규직',
    })
  })

  it('사번이 없어도 통과시킨다 — 채번은 임포트 단계에서 한다', () => {
    const buffer = bufferFromRows([
      { 이름: '문성혁', 부서: '', 근로형태: '정규직', 입사일: '2019-10-10' },
    ])
    const result = parseEmployeeExcel(buffer)
    expect(result.errors).toHaveLength(0)
    expect(result.rows[0].employee_number).toBe('')
  })

  it('부서가 비어 있어도 통과시킨다 — DB가 부서 없음을 허용한다', () => {
    const buffer = bufferFromRows([
      { 사번: 'E100', 이름: '아리', 부서: '', 근로형태: '계약직', 입사일: '2024-10-07' },
    ])
    const result = parseEmployeeExcel(buffer)
    expect(result.errors).toHaveLength(0)
    expect(result.rows[0].department).toBe('')
  })

  it('재직상태와 퇴사일을 읽는다', () => {
    const buffer = bufferFromRows([
      {
        이름: '김미리',
        소속부서: '회계팀',
        계약형태: '정규직',
        입사일: '2024-03-19',
        재직상태: '퇴사',
        퇴사일: '2026-02-20',
      },
    ])
    const result = parseEmployeeExcel(buffer)
    expect(result.rows[0]).toMatchObject({ status: '퇴사', resignation_date: '2026-02-20' })
  })

  it("'재직중'을 DB가 받는 '재직'으로 정규화한다", () => {
    const buffer = bufferFromRows([
      { 이름: '이정현', 부서: '영상콘텐츠팀', 근로형태: '정규직', 입사일: '2024-08-26', 재직상태: '재직중' },
    ])
    const result = parseEmployeeExcel(buffer)
    expect(result.rows[0].status).toBe('재직')
  })

  it('재직상태가 비어 있고 퇴사일이 있으면 퇴사로 본다', () => {
    const buffer = bufferFromRows([
      { 이름: '강유진', 부서: '', 근로형태: '정규직', 입사일: '2024-09-30', 퇴사일: '2025-07-04' },
    ])
    const result = parseEmployeeExcel(buffer)
    expect(result.rows[0].status).toBe('퇴사')
  })

  it('재직상태와 퇴사일이 모두 비어 있으면 재직으로 본다', () => {
    const buffer = bufferFromRows([
      { 이름: '이정현', 부서: '', 근로형태: '정규직', 입사일: '2024-08-26' },
    ])
    const result = parseEmployeeExcel(buffer)
    expect(result.rows[0].status).toBe('재직')
  })

  it('알 수 없는 재직상태는 행 오류로 보고한다', () => {
    const buffer = bufferFromRows([
      { 이름: '홍길동', 부서: '', 근로형태: '정규직', 입사일: '2024-01-01', 재직상태: '파견' },
    ])
    const result = parseEmployeeExcel(buffer)
    expect(result.rows).toHaveLength(0)
    expect(result.errors[0].message).toContain('파견')
  })

  it('이름과 입사일은 여전히 필수다', () => {
    const buffer = bufferFromRows([{ 사번: 'E1', 이름: '', 부서: '', 근로형태: '정규직', 입사일: '' }])
    const result = parseEmployeeExcel(buffer)
    expect(result.rows).toHaveLength(0)
    expect(result.errors[0].message).toContain('이름')
    expect(result.errors[0].message).toContain('입사일')
  })

  it('퇴사일도 엑셀 날짜 셀을 yyyy-MM-dd로 변환한다', () => {
    const buffer = bufferFromAoa([
      ['이름', '부서', '근로형태', '입사일', '퇴사일'],
      ['김현서', '', '정규직', new Date(2024, 6, 8), new Date(2026, 5, 25)],
    ])
    const result = parseEmployeeExcel(buffer)
    expect(result.rows[0].hire_date).toBe('2024-07-08')
    expect(result.rows[0].resignation_date).toBe('2026-06-25')
  })
})
