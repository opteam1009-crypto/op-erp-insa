'use client'

import { useEffect, useRef, useState } from 'react'
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
  const menuButtonRef = useRef<HTMLButtonElement>(null)

  // 라우트가 바뀌면 드로어를 닫는다. 안 그러면 메뉴를 누른 뒤에도 덮여 있다.
  // 렌더 중에 이전 pathname과 비교해 상태를 조정한다 (React가 권장하는
  // "prop이 바뀌면 상태를 조정" 패턴) — 커밋 후 effect로 되돌리는 것보다
  // 한 프레임 빠르고 setState-in-effect 린트 규칙에도 걸리지 않는다.
  // 여기서는 포커스를 되돌리지 않는다: 방금 누른 네브 링크가 이미 포커스를
  // 가져갔으므로, 햄버거로 되돌리면 막 이동한 페이지에서 오히려 포커스를
  // 빼앗는 꼴이 된다.
  const [prevPathname, setPrevPathname] = useState(pathname)
  if (pathname !== prevPathname) {
    setPrevPathname(pathname)
    setOpen(false)
  }

  // 백드롭 클릭 / Escape / 사이드바의 닫기(X) 버튼처럼 "그냥 닫기만" 하는
  // 경로에서는 드로어를 열었던 햄버거 버튼으로 포커스를 되돌린다. 표준
  // 다이얼로그/드로어 해제 패턴이다.
  function closeDrawer() {
    setOpen(false)
    menuButtonRef.current?.focus()
  }

  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closeDrawer()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  // 드로어가 열려 있는 동안 배경 스크롤을 막는다. 하드코딩한 ''이 아니라
  // 이전 값을 저장했다가 복원하는 이유: 다른 코드가 이미 overflow를
  // 건드리고 있었을 가능성을 깨지 않기 위해서다.
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  return (
    <div className="min-h-full">
      <MobileTopBar nav={nav} onOpen={() => setOpen(true)} menuButtonRef={menuButtonRef} />

      {open && (
        <div
          aria-hidden
          onClick={closeDrawer}
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
        />
      )}

      <Sidebar nav={nav} user={user} open={open} onClose={closeDrawer} />

      {/* 드로어가 열려 있는 동안 배경 콘텐츠를 포커스/접근성 트리에서 제거한다.
          별도의 포커스 트랩이 필요 없는 이유: inert가 Tab 이동과 스크린리더
          탐색을 모두 막아 주기 때문이다. 데스크톱(md 이상)에서는 드로어가
          열리지 않으므로(open은 항상 false로 유지) 여기 관여하지 않는다. */}
      <main inert={open} className="md:pl-[260px]">
        <div className="mx-auto w-full max-w-[1400px] px-4 py-5 md:px-8 md:py-7">{children}</div>
      </main>
    </div>
  )
}
