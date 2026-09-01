export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-border bg-surface ${className ?? ''}`}>
      {children}
    </section>
  )
}

export function CardHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
      {children}
    </div>
  )
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-[15px] font-semibold text-fg">{children}</h2>
}

/**
 * 세로 패딩은 `padding` prop으로만 고른다. `className`으로 `py-*`를 넘기면
 * 안 된다 — 클래스 문자열의 순서는 캐스케이드를 결정하지 않고, 컴파일된
 * CSS에서 나중에 정의된 규칙이 이기므로 기본값 `py-4`가 그대로 남는다.
 * `className`은 패딩과 충돌하지 않는 것(grid 배치 등)에만 쓴다.
 */
const CARD_BODY_PADDING = {
  /** 일반 카드 본문. */
  default: 'px-4 py-4',
  /** 행마다 자체 패딩이 있는 내용(DescriptionList, divide-y 목록)을 담을 때. */
  tight: 'px-4 py-1',
  /** 한 줄짜리 필터·액션 바. */
  snug: 'px-4 py-3',
} as const

export type CardBodyPadding = keyof typeof CARD_BODY_PADDING

export function CardBody({
  children,
  padding = 'default',
  className,
}: {
  children: React.ReactNode
  padding?: CardBodyPadding
  className?: string
}) {
  return <div className={`${CARD_BODY_PADDING[padding]} ${className ?? ''}`}>{children}</div>
}
