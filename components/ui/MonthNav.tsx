import Link from 'next/link'
import { buttonClass } from '@/lib/ui/button-class'

/**
 * 이전 달 · 이달 이름 · 다음 달 · 오늘. 링크라서 서버 컴포넌트에서도 클라이언트
 * 컴포넌트에서도 그대로 쓴다. 어느 달인지는 주소(?month=)가 갖고 있으므로
 * 여기서는 상태가 없다.
 */
export function MonthNav({
  label,
  prevHref,
  nextHref,
  todayHref,
}: {
  /** "2026년 9월" */
  label: string
  prevHref: string
  nextHref: string
  todayHref: string
}) {
  return (
    <div className="flex items-center gap-1">
      <Link href={prevHref} aria-label="이전 달" className={buttonClass('ghost', 'icon')}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="m15 6-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>
      {/* 고정 폭이라 "9월"과 "12월" 사이를 오갈 때 화살표가 움직이지 않는다. */}
      <h2 className="tnum min-w-[7em] text-center text-[15px] font-semibold text-fg">{label}</h2>
      <Link href={nextHref} aria-label="다음 달" className={buttonClass('ghost', 'icon')}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>
      <Link href={todayHref} className={buttonClass('secondary', 'sm', 'ml-1')}>
        오늘
      </Link>
    </div>
  )
}
