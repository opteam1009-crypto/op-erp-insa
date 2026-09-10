import Link from 'next/link'
import { sql } from '@/lib/db/sql'
import { PageHeader } from '@/components/ui/PageHeader'
import { Alert } from '@/components/ui/Alert'
import { buttonClass } from '@/lib/ui/button-class'
import { todayInSeoul } from '@/lib/dates/today'
import { resolveMonth, shiftMonth } from '@/lib/dates/month'
import { buildCalendarMonth, type CalendarSource } from '@/lib/calendar/employee-calendar'
import { NewEmployeeModalButton } from '../NewEmployeeModalButton'
import { EmployeeTabs } from '../EmployeeTabs'
import { CalendarView } from './CalendarView'

interface DepartmentRow {
  id: string
  name: string
}

export default async function EmployeeCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; all?: string }>
}) {
  const params = await searchParams
  const today = todayInSeoul()
  const currentMonth = today.slice(0, 7)
  const month = resolveMonth(params.month, today)
  const includeRetired = params.all === '1'

  let rows: CalendarSource[]
  let departments: DepartmentRow[]

  try {
    const [employeeRows, departmentRows] = await Promise.all([
      // 사원이 백 명 남짓이라 달로 자르지 않고 전부 받는다. 어느 달을 보든
      // 같은 쿼리라 단순하고, 달별 필터는 순수 함수(buildCalendarMonth)가
      // 맡아 테스트할 수 있다.
      sql`
        select id, name, salary_negotiation_month,
               -- date를 그대로 넘기면 드라이버가 Date로 만들어 타임존만큼 밀린다.
               -- 달력은 문자열 비교로만 날짜를 다루므로 text로 받는다.
               contract_end_date::text         as contract_end_date,
               contract_review_date::text      as contract_review_date,
               contract_announce_date::text    as contract_announce_date,
               regular_conversion_date::text   as regular_conversion_date,
               salary_review_date::text        as salary_review_date,
               salary_announce_date::text      as salary_announce_date
        from employees
        -- 퇴사자는 기본으로 뺀다. 그들의 계약만료일은 이미 지난 일이거나, 남아
        -- 있더라도 챙길 일정이 아니다. 지난 달을 되짚어 볼 때만 켠다.
        where (${includeRetired}::boolean or status <> '퇴사')
      `,
      sql`select id, name from departments order by name`,
    ])
    rows = employeeRows as CalendarSource[]
    departments = departmentRows as DepartmentRow[]
  } catch (error) {
    console.error('Failed to load employee calendar:', error)
    return <Alert variant="error">일정을 불러오지 못했습니다. 관리자에게 문의하세요.</Alert>
  }

  const data = buildCalendarMonth(rows, month)

  // 이달이면 month를 주소에 남기지 않는다. '오늘' 링크와 탭 링크가 같은
  // 주소가 되어, 같은 화면이 두 주소로 갈리지 않는다.
  function href(targetMonth: string, retired: boolean): string {
    const query = new URLSearchParams()
    if (targetMonth !== currentMonth) query.set('month', targetMonth)
    if (retired) query.set('all', '1')
    const qs = query.toString()
    return qs ? `/employees/calendar?${qs}` : '/employees/calendar'
  }

  return (
    <div>
      <PageHeader
        title="사원 관리"
        description={`${data.label} 일정 ${data.total}건`}
        actions={
          <>
            <Link href="/employees/bulk-upload" className={buttonClass('secondary')}>
              엑셀 일괄 등록
            </Link>
            <NewEmployeeModalButton departments={departments} />
          </>
        }
      />

      <EmployeeTabs active="calendar" />

      <CalendarView
        data={data}
        today={today}
        nav={{
          prev: href(shiftMonth(month, -1), includeRetired),
          next: href(shiftMonth(month, 1), includeRetired),
          today: href(currentMonth, includeRetired),
        }}
        includeRetired={includeRetired}
        toggleRetiredHref={href(month, !includeRetired)}
      />
    </div>
  )
}
