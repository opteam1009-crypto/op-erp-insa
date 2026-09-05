import { toneForStatus, type BadgeTone } from '@/lib/ui/badge-tone'

/** InlineCell이 편집 가능한 배지를 그릴 때도 같은 표를 쓴다. 두 벌이 되면
 *  같은 상태가 화면 위치에 따라 다른 색으로 보인다. */
export const TONE_CLASS: Record<BadgeTone, string> = {
  positive: 'bg-positive/12 text-positive',
  warning: 'bg-warning/12 text-warning',
  negative: 'bg-negative/12 text-negative',
  accent: 'bg-accent/12 text-accent',
  neutral: 'bg-surface-3 text-fg-muted',
  violet: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
  sky: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  emerald: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  amber: 'bg-amber-500/20 text-amber-700 dark:text-amber-300',
  rose: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
  teal: 'bg-teal-500/15 text-teal-700 dark:text-teal-300',
  orange: 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
  cyan: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300',
}

export function Badge({
  children,
  tone,
  status,
  hue,
}: {
  children: React.ReactNode
  /** 명시적 색조. 주면 status 자동 판별보다 우선한다. */
  tone?: BadgeTone
  /** 도메인 상태 문자열. 색조를 자동으로 정한다. */
  status?: string | null
  /** 0~359 색상각. 부서처럼 '좋다/나쁘다'가 없고 서로 구별만 되면 되는 값에
   *  쓴다. 주면 tone/status보다 우선한다. */
  hue?: number
}) {
  const base = 'inline-flex items-center rounded-full px-2 py-0.5 text-[12px] font-medium'

  if (hue !== undefined) {
    return (
      <span className={`${base} badge-hue`} style={{ '--badge-h': hue } as React.CSSProperties}>
        {children}
      </span>
    )
  }

  return <span className={`${base} ${TONE_CLASS[tone ?? toneForStatus(status)]}`}>{children}</span>
}
