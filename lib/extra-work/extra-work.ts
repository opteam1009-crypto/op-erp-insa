/**
 * 연장근무·휴일근무 정산.
 *
 * 둘은 데이터도 화면도 같은 모양이라 한 표(extra_work)와 한 화면을 쓰고 종류
 * 값만 다르다. 정산 단위는 사원·종류·월이다 — 서류는 사람마다 한 달에 한 장
 * 오고, 정산은 말일에 달 단위로 한다.
 */
export const EXTRA_WORK_KINDS = ['연장근무', '휴일근무'] as const
export type ExtraWorkKind = (typeof EXTRA_WORK_KINDS)[number]

export interface ExtraWorkKindInfo {
  href: string
  /** Blob 경로와 주소에 쓰는 영문 이름. */
  slug: string
  description: string
}

export const EXTRA_WORK_KIND_INFO: Record<ExtraWorkKind, ExtraWorkKindInfo> = {
  연장근무: {
    href: '/payroll/overtime',
    slug: 'overtime',
    description: '그 달에 연장근무를 한 사원과 서류 제출 현황. 말일에 정산합니다.',
  },
  휴일근무: {
    href: '/payroll/holiday-work',
    slug: 'holiday-work',
    description: '그 달에 휴일근무를 한 사원과 서류 제출 현황. 말일에 정산합니다.',
  },
}

/** 목록 한 줄. 페이지가 employees·departments를 조인해 이 모양으로 받는다. */
export interface ExtraWorkRow {
  id: string
  employee_id: string
  employee_number: string
  employee_name: string
  department_name: string | null
  /** numeric 컬럼은 드라이버가 문자열로 돌려준다. 계산 전에 Number()를 거친다. */
  hours: string | null
  note: string | null
  /** 서류를 받은 날. 서울 기준 YYYY-MM-DD. 비어 있으면 미제출이다. */
  submitted_on: string | null
  file_name: string | null
}

export interface ExtraWorkSummary {
  total: number
  submitted: number
  pending: number
  /** 시간이 적힌 건들의 합. */
  hours: number
}

export function isSubmitted(row: Pick<ExtraWorkRow, 'submitted_on'>): boolean {
  return row.submitted_on !== null
}

export function summarizeExtraWork(rows: ExtraWorkRow[]): ExtraWorkSummary {
  let submitted = 0
  let hours = 0
  for (const row of rows) {
    if (isSubmitted(row)) submitted += 1
    if (row.hours !== null) hours += Number(row.hours)
  }
  return { total: rows.length, submitted, pending: rows.length - submitted, hours }
}

/**
 * numeric(5,1)이 준 '12.0'을 '12'로, '12.5'는 그대로. 비어 있으면 '-'.
 * 표에서 소수점 .0이 줄줄이 붙으면 눈이 그것부터 읽는다.
 */
export function formatHours(hours: string | number | null): string {
  if (hours === null || hours === '') return '-'
  const n = Number(hours)
  if (!Number.isFinite(n)) return '-'
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

/**
 * 팀에 붙여 넣을 미제출 명단. 부서별로 묶는다 — 요청은 팀 단위로 나가므로
 * 팀장이 자기 팀 줄만 보면 된다.
 *
 *   2026년 9월 연장근무 서류 미제출 3명
 *   · 마케팅부: 김범수, 허진혁
 *   · 회계팀: 변정득
 */
export function pendingListText(rows: ExtraWorkRow[], kind: ExtraWorkKind, monthLabel: string): string {
  const pending = rows.filter((row) => !isSubmitted(row))
  const header = `${monthLabel} ${kind} 서류 미제출 ${pending.length}명`
  if (pending.length === 0) return header

  const byDepartment = new Map<string, string[]>()
  for (const row of pending) {
    const key = row.department_name ?? '부서 미지정'
    ;(byDepartment.get(key) ?? byDepartment.set(key, []).get(key)!).push(row.employee_name)
  }

  const lines = [...byDepartment.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'ko'))
    .map(([department, names]) => `· ${department}: ${names.join(', ')}`)

  return [header, ...lines].join('\n')
}
