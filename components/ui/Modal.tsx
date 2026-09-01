'use client'

import { useEffect, useRef } from 'react'
import { buttonClass } from '@/lib/ui/button-class'

/**
 * 네이티브 <dialog>의 showModal() 위에 올린 모달.
 *
 * showModal()을 쓰면 포커스 트랩, Escape 닫기, 백드롭(::backdrop), top-layer
 * 렌더링을 브라우저가 처리한다. AppShell의 모바일 드로어에서 손으로 만들었던
 * inert 처리와 포커스 복귀도 여기서는 필요 없다 — 모달이 열려 있는 동안
 * 바깥 트리는 브라우저가 이미 비활성으로 취급하고, 닫히면 열기 전에 포커스가
 * 있던 요소로 되돌려 준다.
 *
 * 브라우저가 직접 처리하지 않는 것은 두 가지뿐이다:
 * 배경 스크롤 잠금과, 백드롭 클릭으로 닫기.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  // 배경 스크롤 잠금. 이전 값을 저장했다 되돌린다 — 빈 문자열로 덮으면
  // 다른 코드가 걸어둔 잠금까지 풀어 버린다.
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="modal-title"
      // Escape와 닫기 버튼 모두 <dialog>의 close 이벤트로 수렴하므로
      // 여기 한 곳에서만 상태를 되돌리면 된다.
      onClose={onClose}
      // 백드롭은 <dialog> 자신의 여백이라 클릭 대상이 dialog 자체일 때만
      // 백드롭 클릭이다. 내용 영역 클릭은 자식이 target이므로 걸리지 않는다.
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose()
      }}
      className={
        'w-[min(calc(100vw-2rem),640px)] rounded-xl border border-border bg-surface p-0 text-fg ' +
        'backdrop:bg-black/40 open:flex open:flex-col max-h-[min(calc(100vh-4rem),44rem)]'
      }
    >
      <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
        <div>
          <h2 id="modal-title" className="text-[15px] font-semibold text-fg">
            {title}
          </h2>
          {description && <p className="mt-1 text-[12px] text-fg-muted">{description}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className={buttonClass('ghost', 'icon')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
    </dialog>
  )
}
