import { requireUser } from '@/lib/auth/current-user'
import { buildNavItems } from '@/lib/nav/items'
import { AppShell } from '@/components/shell/AppShell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()

  // 권한 필터링은 서버에서 끝낸다. 클라이언트 셸은 결과만 받는다.
  const nav = buildNavItems(user.role)

  return (
    <AppShell nav={nav} user={{ email: user.email, role: user.role }}>
      {children}
    </AppShell>
  )
}
