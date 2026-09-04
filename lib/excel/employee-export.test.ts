import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { buildEmployeeWorkbook, type EmployeeExportRow } from './employee-export'
import { parseEmployeeExcel } from './employee-parser'

const 홍길동: Partial<EmployeeExportRow> = {
  employee_number: 'E001',
  name: '홍길동',
  departments: { name: '기획운영팀' },
  position: '매니저',
  employment_type: '정규직',
  hire_date: '2024-01-15',
  resignation_date: null,
  status: '재직',
  birth_date: '1990-05-02',
  phone: '010-1111-2222',
  emergency_contact: '010-3333-4444',
}

describe('buildEmployeeWorkbook', () => {
  it('writes every employee field to a named column', () => {
    const buffer = buildEmployeeWorkbook([홍길동] as EmployeeExportRow[])
    const workbook = XLSX.read(buffer, { type: 'array' })
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(
      workbook.Sheets[workbook.SheetNames[0]]
    )

    expect(rows[0]).toMatchObject({
      사번: 'E001',
      이름: '홍길동',
      부서: '기획운영팀',
      직급: '매니저',
      근로형태: '정규직',
      입사일: '2024-01-15',
      재직상태: '재직',
      생년월일: '1990-05-02',
      연락처: '010-1111-2222',
      비상연락망: '010-3333-4444',
    })
  })

  it('leaves 부서 blank for an employee with no department', () => {
    const buffer = buildEmployeeWorkbook([{ ...홍길동, departments: null }] as EmployeeExportRow[])
    const workbook = XLSX.read(buffer, { type: 'array' })
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(
      workbook.Sheets[workbook.SheetNames[0]],
      { defval: '' }
    )
    expect(rows[0]['부서']).toBe('')
  })

  /**
   * 일괄 등록 화면은 이 파일을 "현재 사원 목록 다운로드"로 내려받아 고친 뒤
   * 그대로 다시 올리라고 안내한다. 그래서 내보내기 열 구성과 파서가 읽는 열이
   * 어긋나면 안 된다 — 예전에는 부서 열이 빠져 있어서 받은 파일을 그대로
   * 올리면 모든 행이 "필수 항목 누락"으로 실패했다.
   */
  it('produces a file the importer accepts unchanged', () => {
    const buffer = buildEmployeeWorkbook([홍길동] as EmployeeExportRow[])
    const result = parseEmployeeExcel(buffer)

    expect(result.errors).toEqual([])
    expect(result.rows[0]).toMatchObject({
      employee_number: 'E001',
      name: '홍길동',
      department: '기획운영팀',
      employment_type: '정규직',
      hire_date: '2024-01-15',
      status: '재직',
    })
  })

  it('round-trips a resigned employee without turning them 재직', () => {
    const buffer = buildEmployeeWorkbook([
      { ...홍길동, status: '퇴사', resignation_date: '2025-07-31' },
    ] as EmployeeExportRow[])
    const result = parseEmployeeExcel(buffer)

    expect(result.rows[0].status).toBe('퇴사')
    expect(result.rows[0].resignation_date).toBe('2025-07-31')
  })
})
