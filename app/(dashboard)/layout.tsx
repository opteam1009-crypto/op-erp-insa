import Link from 'next/link'
import { requireUser } from '@/lib/auth/current-user'
import { permissions } from '@/lib/auth/permissions'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()

  const navItems: { href: string; label: string }[] = [
    { href: '/employees', label: '사원 관리' },
    { href: '/franchise-stores', label: '가맹점 관리' },
    ...(permissions.canViewPayroll(user.role) ? [{ href: '/payroll', label: '급여대장' }] : []),
    ...(permissions.canViewProfitLoss(user.role) ? [{ href: '/profit-loss', label: '손익 정산' }] : []),
    { href: '/documents', label: '증빙 관리' },
  ]

  return (
    <div>
      <header className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-6">
          <span className="font-semibold">회사 ERP</span>
          <nav className="flex items-center gap-4 text-sm">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="text-gray-700 hover:underline">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <span className="text-sm text-gray-500">{user.email} ({user.role})</span>
      </header>
      <main className="p-6">{children}</main>
    </div>
  )
}
