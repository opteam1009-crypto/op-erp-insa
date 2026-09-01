'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { isNavItemActive, type NavGroup } from '@/lib/nav/items'
import { signOut } from '@/lib/auth/actions'
import { buttonClass } from '@/lib/ui/button-class'
import { Badge } from '@/components/ui/Badge'
import { Icon } from './icons'
import { ThemeToggle } from './ThemeToggle'

export interface ShellUser {
  email: string
  role: string
}

export function Sidebar({
  nav,
  user,
  open,
  onClose,
}: {
  nav: NavGroup[]
  user: ShellUser
  open: boolean
  onClose: () => void
}) {
  const pathname = usePathname()

  return (
    <aside
      className={[
        'fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-border bg-surface-2',
        'transition-transform duration-200 ease-out md:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full',
      ].join(' ')}
    >
      <div className="flex h-14 items-center justify-between gap-2 px-4">
        <Link href="/employees" className="flex items-center gap-2">
          <span
            aria-hidden
            className="flex h-6 w-6 items-center justify-center rounded bg-accent text-[12px] font-bold text-accent-fg"
          >
            E
          </span>
          <span className="text-[15px] font-semibold text-fg">회사 ERP</span>
        </Link>
        <button
          type="button"
          onClick={onClose}
          aria-label="메뉴 닫기"
          className={buttonClass('ghost', 'icon', 'md:hidden')}
        >
          <Icon name="close" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 py-2">
        {nav.map((group) => (
          <div key={group.label} className="mb-4 last:mb-0">
            <p className="px-2 pb-1.5 text-[11px] font-medium tracking-wider text-fg-subtle">
              {group.label}
            </p>
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const active = isNavItemActive(pathname, item.href)
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={[
                        'relative flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13.5px] transition-colors',
                        active
                          ? 'bg-surface-3 font-medium text-fg'
                          : 'text-fg-muted hover:bg-surface-3/60 hover:text-fg',
                      ].join(' ')}
                    >
                      {active && (
                        <span
                          aria-hidden
                          className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-accent"
                        />
                      )}
                      <Icon name={item.icon} />
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-border px-3 py-3">
        <div className="mb-2 flex items-center gap-2.5">
          <span
            aria-hidden
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-3 text-[12px] font-semibold text-fg-muted"
          >
            {user.email.charAt(0).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1 truncate text-[12px] text-fg-muted" title={user.email}>
            {user.email}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <Badge tone="neutral">{user.role}</Badge>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <form action={signOut}>
              <button
                type="submit"
                aria-label="로그아웃"
                title="로그아웃"
                className={buttonClass('ghost', 'icon')}
              >
                <Icon name="logout" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </aside>
  )
}
