'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import type { NavGroup } from '@/lib/nav/items'
import { Sidebar, type ShellUser } from './Sidebar'
import { MobileTopBar } from './MobileTopBar'

export type { ShellUser }

export function AppShell({
  nav,
  user,
  children,
}: {
  nav: NavGroup[]
  user: ShellUser
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // 라우트가 바뀌면 드로어를 닫는다. 안 그러면 메뉴를 누른 뒤에도 덮여 있다.
  // 렌더 중에 이전 pathname과 비교해 상태를 조정한다 (React가 권장하는
  // "prop이 바뀌면 상태를 조정" 패턴) — 커밋 후 effect로 되돌리는 것보다
  // 한 프레임 빠르고 setState-in-effect 린트 규칙에도 걸리지 않는다.
  const [prevPathname, setPrevPathname] = useState(pathname)
  if (pathname !== prevPathname) {
    setPrevPathname(pathname)
    setOpen(false)
  }

  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  return (
    <div className="min-h-full">
      <MobileTopBar nav={nav} onOpen={() => setOpen(true)} />

      {open && (
        <div
          aria-hidden
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
        />
      )}

      <Sidebar nav={nav} user={user} open={open} onClose={() => setOpen(false)} />

      <main className="md:pl-[260px]">
        <div className="mx-auto w-full max-w-[1400px] px-4 py-5 md:px-8 md:py-7">{children}</div>
      </main>
    </div>
  )
}
