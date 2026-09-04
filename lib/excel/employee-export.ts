import * as XLSX from 'xlsx'
import type { Employee } from '@/lib/types'

export interface EmployeeExportRow extends Employee {
  departments?: { name: string } | null
}

/**
 * 열 구성은 employee-parser가 읽는 것과 같게 맞춘다. 이 파일은 일괄 등록
 * 화면에서 "현재 사원 목록 다운로드"로 받아 그대로 고쳐 다시 올리는 용도라,
 * 내보내기에 없는 열이 가져오기에서 필수면 받은 파일을 되올릴 수 없다.
 */
export function buildEmployeeWorkbook(employees: EmployeeExportRow[]): ArrayBuffer {
  const rows = employees.map((e) => ({
    사번: e.employee_number,
    이름: e.name,
    부서: e.departments?.name ?? '',
    직급: e.position ?? '',
    근로형태: e.employment_type,
    입사일: e.hire_date,
    퇴사일: e.resignation_date ?? '',
    재직상태: e.status,
    생년월일: e.birth_date ?? '',
    연락처: e.phone ?? '',
    비상연락망: e.emergency_contact ?? '',
  }))

  const sheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, '사원목록')
  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
}
