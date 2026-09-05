'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { usePathname } from 'next/navigation'
import type { NavGroup } from '@/lib/nav/items'
import type { UpcomingItem } from '@/lib/notifications/upcoming'
import { Sidebar } from './Sidebar'
import { MobileTopBar } from './MobileTopBar'


// Tailwind's default `md` breakpoint (the same one every `md:` class in this
// shell keys off). Keeping it here as the single JS-side source of truth so
// `open` and `inert` can react to the *actual* viewport, not just the last
// value the drawer's own open/close handlers set.
const DESKTOP_QUERY = '(min-width: 768px)'

function subscribeToViewport(callback: () => void) {
  const mql = window.matchMedia(DESKTOP_QUERY)
  mql.addEventListener('change', callback)
  return () => mql.removeEventListener('change', callback)
}

function getIsDesktopSnapshot(): boolean {
  return window.matchMedia(DESKTOP_QUERY).matches
}

function getIsDesktopServerSnapshot(): boolean {
  return false
}

export function AppShell({
  nav,
  upcoming,
  children,
}: {
  nav: NavGroup[]
  /** 종 아이콘이 보여줄 다가오는 일정. 레이아웃이 서버에서 조회해 내려준다. */
  upcoming: UpcomingItem[]
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const isDesktop = useSyncExternalStore(
    subscribeToViewport,
    getIsDesktopSnapshot,
    getIsDesktopServerSnapshot,
  )

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

  // 뷰포트가 md 이상으로 바뀌면 드로어를 강제로 닫는다. 그 폭에서는
  // 사이드바가 md:translate-x-0으로 항상 보이고 햄버거/백드롭은 md:hidden으로
  // 사라지므로, open이 true로 남아 있으면 아래 <main inert>와 스크롤 잠금이
  // 풀리지 않은 채 화면이 멈춘 것처럼 보인다 (Escape는 여전히 통하지만 마우스
  // 사용자는 이유를 알 길이 없다). 같은 "prop이 바뀌면 상태를 조정" 패턴이라
  // pathname 처리와 마찬가지로 렌더 중에 처리하며, 첫 렌더 포함 매 렌더마다
  // isDesktop을 다시 계산하므로 별도의 마운트 시점 체크가 필요 없다.
  const [prevIsDesktop, setPrevIsDesktop] = useState(isDesktop)
  if (isDesktop !== prevIsDesktop) {
    setPrevIsDesktop(isDesktop)
    if (isDesktop) setOpen(false)
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
      <MobileTopBar
        nav={nav}
        upcoming={upcoming}
        onOpen={() => setOpen(true)}
        menuButtonRef={menuButtonRef}
        inert={open}
      />

      {open && (
        <div
          aria-hidden
          onClick={closeDrawer}
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
        />
      )}

      <Sidebar
        nav={nav}
        upcoming={upcoming}
        open={open}
        onClose={closeDrawer}
        isDesktop={isDesktop}
      />

      {/* 드로어가 열려 있는 동안 배경 콘텐츠를 포커스/접근성 트리에서 제거한다.
          별도의 포커스 트랩이 필요 없는 이유: inert가 Tab 이동과 스크린리더
          탐색을 모두 막아 주기 때문이다 — 단, main뿐 아니라 그 형제인
          MobileTopBar에도 걸어야 한다. MobileTopBar는 main의 형제이므로
          main만 inert면 백드롭 아래 깔린 메뉴 열기 버튼이 여전히 Tab으로
          닿는다 (위 MobileTopBar 호출부의 inert={open} 참고). 데스크톱(md
          이상)에서는 위의 isDesktop 보정 덕분에 open이 항상 false로 유지되므로
          여기 관여하지 않는다. */}
      <main inert={open} className="md:pl-[260px]">
        <div className="mx-auto w-full max-w-[1400px] px-4 py-5 md:px-8 md:py-7">{children}</div>
      </main>
    </div>
  )
}
