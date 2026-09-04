import { requireSession } from '@/lib/auth/current-user'
import { NAV_GROUPS } from '@/lib/nav/items'
import { AppShell } from '@/components/shell/AppShell'

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

  return <AppShell nav={NAV_GROUPS}>{children}</AppShell>
}
