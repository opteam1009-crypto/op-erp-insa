import { sql } from '@/lib/db/sql'
import { Alert } from '@/components/ui/Alert'
import { todayInSeoul } from '@/lib/dates/today'
import { resolveMonth } from '@/lib/dates/month'
import { type ExtraWorkKind, type ExtraWorkRow } from '@/lib/extra-work/extra-work'
import type { TargetCandidate } from './AddTargetsModalButton'
import { ExtraWorkView } from './ExtraWorkView'

/**
 * 연장근무·휴일근무 정산 화면. 두 라우트(/payroll/overtime, /payroll/holiday-work)가
 * kind만 다르게 이 컴포넌트를 그린다.
 *
 * 한 달치 대상자와 서류 제출 현황이 한 표다. "누가 했나"는 대상 추가로 올리고,
 * "누가 냈나"는 서류 올리기나 제출 배지로 찍는다. 미제출이 0이 되면 정산이다.
 */
export async function ExtraWorkPage({
  kind,
  searchParams,
}: {
  kind: ExtraWorkKind
  searchParams: Promise<{ month?: string }>
}) {
  const params = await searchParams
  const today = todayInSeoul()
  const period = resolveMonth(params.month, today)

  let rows: ExtraWorkRow[]
  let candidates: TargetCandidate[]
  let departments: { name: string }[]

  try {
    const [workRows, employeeRows, departmentRows] = await Promise.all([
      sql`
        select x.id, x.employee_id, x.note, x.file_name,
               -- numeric은 문자열로, timestamptz는 서울 날짜 문자열로 받는다. Date로
               -- 받으면 서버(UTC)와 화면의 날짜가 어긋난다.
               x.hours::text as hours,
               to_char(x.submitted_at at time zone 'Asia/Seoul', 'YYYY-MM-DD') as submitted_on,
               e.employee_number, e.name as employee_name,
               d.name as department_name
        from extra_work x
        join employees e on e.id = x.employee_id
        left join departments d on d.id = e.department_id
        where x.kind = ${kind} and x.period = ${period}
        order by d.name nulls last, e.employee_number
      `,
      // 대상 추가 모달의 후보. 퇴사자도 넣는다 — 말일 정산 전에 나간 사람의
      // 근무도 정산 대상이다. 모달이 상태 배지로 구분해 보여 준다.
      sql`
        select e.id, e.employee_number, e.name, e.status, d.name as department_name
        from employees e
        left join departments d on d.id = e.department_id
        order by d.name nulls last, e.employee_number
      `,
      sql`select name from departments order by name`,
    ])
    rows = workRows as ExtraWorkRow[]
    candidates = employeeRows as TargetCandidate[]
    departments = departmentRows as { name: string }[]
  } catch (error) {
    // 마이그레이션(db/migrations/0002)이 아직 안 돌았으면 여기로 온다.
    console.error(`Failed to load ${kind}:`, error)
    return (
      <Alert variant="error">
        {kind} 정산 데이터를 불러오지 못했습니다. 관리자에게 문의하세요.
      </Alert>
    )
  }

  return (
    <ExtraWorkView
      kind={kind}
      period={period}
      today={today}
      rows={rows}
      candidates={candidates}
      departments={departments}
    />
  )
}
