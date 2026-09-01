import { toneForStatus, type BadgeTone } from '@/lib/ui/badge-tone'

const TONE_CLASS: Record<BadgeTone, string> = {
  positive: 'bg-positive/12 text-positive',
  warning: 'bg-warning/12 text-warning',
  negative: 'bg-negative/12 text-negative',
  accent: 'bg-accent/12 text-accent',
  neutral: 'bg-surface-3 text-fg-muted',
}

export function Badge({
  children,
  tone,
  status,
}: {
  children: React.ReactNode
  /** 명시적 색조. 주면 status 자동 판별보다 우선한다. */
  tone?: BadgeTone
  /** 도메인 상태 문자열. 색조를 자동으로 정한다. */
  status?: string | null
}) {
  const resolved = tone ?? toneForStatus(status)
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[12px] font-medium ${TONE_CLASS[resolved]}`}
    >
      {children}
    </span>
  )
}
