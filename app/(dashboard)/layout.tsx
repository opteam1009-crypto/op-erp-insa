import { requireSession } from '@/lib/auth/current-user'
import { NAV_GROUPS } from '@/lib/nav/items'
import { AppShell } from '@/components/shell/AppShell'
import { sql } from '@/lib/db/sql'
import {
  collectUpcoming,
  UPCOMING_WINDOW_DAYS,
  type UpcomingItem,
  type UpcomingSource,
} from '@/lib/notifications/upcoming'

/**
 * 서버가 UTC로 도는데 쓰는 사람은 한국에 있다. new Date()의 날짜를 그대로 쓰면
 * 한국 시간 오전 9시 이전에는 '어제'가 오늘이 되어, 오늘 일정이 하루 늦게
 * 종에 걸린다. en-CA 로캘의 출력이 YYYY-MM-DD다.
 */
function todayInSeoul(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date())
}

async function loadUpcoming(): Promise<UpcomingItem[]> {
  const today = todayInSeoul()
  try {
    const rows = await sql`
      select id, name,
             contract_review_date::text   as contract_review_date,
             contract_announce_date::text as contract_announce_date,
             salary_review_date::text     as salary_review_date,
             salary_announce_date::text   as salary_announce_date
      from employees
      where status = '재직'
        and least(
              coalesce(contract_review_date,   'infinity'::date),
              coalesce(contract_announce_date, 'infinity'::date),
              coalesce(salary_review_date,     'infinity'::date),
              coalesce(salary_announce_date,   'infinity'::date)
            -- 파라미터는 타입이 없는 채로 넘어온다. int로 못박지 않으면
            -- date + unknown이 되어 어떤 + 연산자인지 고르지 못한다.
            ) between ${today}::date and ${today}::date + ${UPCOMING_WINDOW_DAYS}::int
    `
    return collectUpcoming(rows as UpcomingSource[], today)
  } catch (error) {
    // 알림이 안 뜨는 것과 앱 전체가 안 뜨는 것은 다르다. 종은 부가 기능이므로
    // 조회가 실패하면 조용히 빈 목록으로 둔다.
    console.error('Failed to load upcoming reminders:', error)
    return []
  }
}

/**
 * 이 그룹의 모든 페이지는 세션과 DB를 요구하므로 정적으로 만들 수 없다.
 * 명시하지 않으면 빌드가 정적 생성을 시도하다 DATABASE_URL이 없는 환경(프리뷰,
 * CI)에서 실패한다.
 */
export const dynamic = 'force-dynamic'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // proxy.ts가 요청 단위로 이미 막지만, 미들웨어를 우회한 렌더 경로에 대한
  // 두 번째 검사로 남겨 둔다.
  await requireSession()

  const upcoming = await loadUpcoming()

  return (
    <AppShell nav={NAV_GROUPS} upcoming={upcoming}>
      {children}
    </AppShell>
  )
}
