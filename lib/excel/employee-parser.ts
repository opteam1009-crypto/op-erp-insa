import * as XLSX from 'xlsx'
import { format } from 'date-fns'

export type EmployeeStatus = '재직' | '휴직' | '퇴사'

export interface EmployeeRow {
  employee_number: string
  name: string
  department: string
  position: string
  employment_type: string
  hire_date: string
  resignation_date: string
  status: EmployeeStatus
  birth_date: string
  phone: string
  emergency_contact: string
}

export interface EmployeeParseResult {
  rows: EmployeeRow[]
  errors: { row: number; message: string }[]
}

/**
 * 헤더 별칭. 실제 인사대장은 '부서'를 '소속부서'로, '근로형태'를 '계약형태'로
 * 적는 등 표기가 제각각이라, 열 이름 하나가 다르다는 이유로 파일 전체를
 * 반려하지 않도록 흔한 변형을 받아 준다. 앞에 있는 이름부터 찾는다.
 */
const HEADER_ALIASES = {
  employee_number: ['사번', '사원번호'],
  name: ['이름', '성명'],
  department: ['부서', '소속부서', '소속'],
  position: ['직급'],
  employment_type: ['근로형태', '계약형태', '고용형태'],
  hire_date: ['입사일'],
  resignation_date: ['퇴사일', '퇴직일'],
  status: ['재직상태', '상태'],
  birth_date: ['생년월일', '생일'],
  phone: ['연락처', '전화번호'],
  emergency_contact: ['비상연락망', '비상연락처'],
} as const satisfies Record<keyof EmployeeRow, readonly string[]>

/**
 * 사번과 부서는 필수가 아니다. 사번은 비어 있으면 임포트 단계에서 채번하고,
 * 부서는 DB가 department_id NULL을 허용한다 (대표처럼 소속이 없는 경우, 또는
 * 이미 없어진 팀에 있던 퇴사자).
 */
const REQUIRED_FIELDS = ['name', 'employment_type', 'hire_date'] as const

const REQUIRED_LABELS: Record<(typeof REQUIRED_FIELDS)[number], string> = {
  name: '이름',
  employment_type: '근로형태',
  hire_date: '입사일',
}

/** 대장마다 '재직중', '퇴직'처럼 적는 표기를 DB의 check 제약 값으로 모은다. */
const STATUS_ALIASES: Record<string, EmployeeStatus> = {
  재직: '재직',
  재직중: '재직',
  휴직: '휴직',
  휴직중: '휴직',
  퇴사: '퇴사',
  퇴직: '퇴사',
  퇴사자: '퇴사',
}

/**
 * A real Excel date cell is stored as a serial number (e.g. 45306.000601851854), which
 * would never match employeeSchema's YYYY-MM-DD regex. XLSX.read(..., { cellDates: true })
 * turns those cells into JS Date objects at local midnight, which we format back to
 * yyyy-MM-dd here. Cells that were plain text are passed through unchanged.
 */
function cellToString(value: unknown): string {
  if (value instanceof Date) return format(value, 'yyyy-MM-dd')
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

/** 별칭 중 값이 들어 있는 첫 열을 읽는다. */
function readField(raw: Record<string, unknown>, field: keyof EmployeeRow): string {
  for (const header of HEADER_ALIASES[field]) {
    const value = cellToString(raw[header])
    if (value) return value
  }
  return ''
}

export function parseEmployeeExcel(buffer: ArrayBuffer): EmployeeParseResult {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })

  const errors: EmployeeParseResult['errors'] = []
  const rows: EmployeeRow[] = []

  json.forEach((raw, index) => {
    const rowNumber = index + 2

    const missing = REQUIRED_FIELDS.filter((field) => !readField(raw, field))
    if (missing.length > 0) {
      errors.push({
        row: rowNumber,
        message: `필수 항목 누락: ${missing.map((f) => REQUIRED_LABELS[f]).join(', ')}`,
      })
      return
    }

    const resignationDate = readField(raw, 'resignation_date')
    const rawStatus = readField(raw, 'status')

    // 재직상태 열이 없는 대장도 흔하다. 그럴 때 퇴사일이 적혀 있으면 퇴사로,
    // 아니면 재직으로 본다 — 비워 두고 DB 기본값('재직')에 맡기면 퇴사자가
    // 재직중으로 들어가 목록에 섞인다.
    let status: EmployeeStatus
    if (!rawStatus) {
      status = resignationDate ? '퇴사' : '재직'
    } else {
      const normalized = STATUS_ALIASES[rawStatus]
      if (!normalized) {
        errors.push({ row: rowNumber, message: `알 수 없는 재직상태: "${rawStatus}"` })
        return
      }
      status = normalized
    }

    rows.push({
      employee_number: readField(raw, 'employee_number'),
      name: readField(raw, 'name'),
      department: readField(raw, 'department'),
      position: readField(raw, 'position'),
      employment_type: readField(raw, 'employment_type'),
      hire_date: readField(raw, 'hire_date'),
      resignation_date: resignationDate,
      status,
      birth_date: readField(raw, 'birth_date'),
      phone: readField(raw, 'phone'),
      emergency_contact: readField(raw, 'emergency_contact'),
    })
  })

  return { rows, errors }
}
