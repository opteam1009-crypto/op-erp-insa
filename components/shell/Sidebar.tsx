'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { isNavItemActive, type NavGroup } from '@/lib/nav/items'
import { signOut } from '@/lib/auth/actions'
import { buttonClass } from '@/lib/ui/button-class'
import { Icon } from './icons'
import { ThemeToggle } from './ThemeToggle'

export function Sidebar({
  nav,
  open,
  onClose,
  isDesktop,
}: {
  nav: NavGroup[]
  open: boolean
  onClose: () => void
  /** md 이상 여부. 오프캔버스(모바일에서 닫힘) 판정에만 쓴다 — 데스크톱에서는
   * 사이드바가 상시 노출된 페이지의 일부이므로 절대 inert가 되면 안 된다. */
  isDesktop: boolean
}) {
  const pathname = usePathname()
  // md 미만이면서 닫혀 있을 때만 "화면 밖" 상태다. md 이상에서는 open 값과
  // 무관하게 항상 false — "닫혀 있으면 inert"로 단순화하면 데스크톱에서
  // 사이드바 전체가 못 쓰게 된다.
  const offCanvas = !isDesktop && !open

  return (
    <aside
      inert={offCanvas}
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

      {/* 이름도 역할도 표시하지 않는다 — 공용 비밀번호 하나라 표시할 신원이
          없다. 테마 토글과 로그아웃만 남는다. */}
      <div className="flex items-center justify-end gap-1 border-t border-border px-3 py-3">
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
    </aside>
  )
}
