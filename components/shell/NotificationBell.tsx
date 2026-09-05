'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  daysLeftLabel,
  UPCOMING_WINDOW_DAYS,
  type UpcomingItem,
} from '@/lib/notifications/upcoming'
import { buttonClass } from '@/lib/ui/button-class'
import { Icon } from './icons'

export function NotificationBell({
  items,
  side = 'bottom',
  align = 'right',
}: {
  items: UpcomingItem[]
  /** 패널이 버튼의 위로 열릴지 아래로 열릴지. 사이드바 하단 바에서는 'top'. */
  side?: 'top' | 'bottom'
  /** 패널의 어느 쪽 모서리를 버튼에 맞출지. 화면 왼쪽 끝의 버튼은 'left'라야
   *  패널이 뷰포트 밖으로 잘리지 않는다. */
  align?: 'left' | 'right'
}) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // 사원 링크를 눌러 이동하면 패널을 닫는다. 열어 둔 채로 두면 목적지 화면 위에
  // 남아 덮는다. 사이드바 드로어와 같은 "prop이 바뀌면 상태를 조정" 패턴.
  const [prevPathname, setPrevPathname] = useState(pathname)
  if (pathname !== prevPathname) {
    setPrevPathname(pathname)
    setOpen(false)
  }

  useEffect(() => {
    if (!open) return

    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      setOpen(false)
      buttonRef.current?.focus()
    }

    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const count = items.length

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={count ? `알림 ${count}건` : '알림 없음'}
        className={`${buttonClass('ghost', 'icon')} relative`}
      >
        <Icon name="bell" size={18} />
        {count > 0 && (
          // 개수는 패널을 열면 읽힌다. 점은 "볼 게 있다"만 말한다 — 건수는 버튼
          // 레이블에 들어가므로 스크린리더에서 빠지지 않는다.
          <span
            aria-hidden
            className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-negative ring-2 ring-surface-2"
          />
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="다가오는 일정"
          className={[
            'absolute z-50 overflow-hidden rounded-lg border border-border bg-surface shadow-lg',
            // 좁은 화면에서 320px를 고집하면 반대쪽으로 삐져나간다.
            'w-[min(320px,calc(100vw-2rem))]',
            side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
            align === 'left' ? 'left-0' : 'right-0',
          ].join(' ')}
        >
          <div className="flex items-baseline justify-between gap-2 border-b border-border px-3 py-2.5">
            <span className="text-[13px] font-semibold text-fg">다가오는 일정</span>
            <span className="text-[11px] text-fg-subtle">{UPCOMING_WINDOW_DAYS}일 이내</span>
          </div>

          {count ? (
            <ul className="max-h-[320px] overflow-y-auto">
              {items.map((item) => (
                <li
                  key={`${item.employeeId}-${item.kind}`}
                  className="border-b border-border last:border-b-0"
                >
                  <Link
                    href={`/employees/${item.employeeId}`}
                    className="flex items-baseline justify-between gap-3 px-3 py-2.5 hover:bg-surface-2"
                  >
                    <span className="min-w-0">
                      <span className="text-[13px] font-medium text-fg">{item.employeeName}</span>
                      <span className="ml-1.5 text-[12px] text-fg-muted">{item.label}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span
                        className={`block text-[12px] font-medium ${
                          item.daysLeft <= 1 ? 'text-negative' : 'text-fg-muted'
                        }`}
                      >
                        {daysLeftLabel(item.daysLeft)}
                      </span>
                      <span className="tnum block text-[11px] text-fg-subtle">{item.date}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-3 py-6 text-center text-[12px] text-fg-subtle">
              {UPCOMING_WINDOW_DAYS}일 이내에 예정된 일정이 없습니다.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
