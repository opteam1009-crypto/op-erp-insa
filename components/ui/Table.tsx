import { EmptyState } from './EmptyState'

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full border-collapse text-[13.5px]">{children}</table>
    </div>
  )
}

export function THead({ children }: { children: React.ReactNode }) {
  return <thead className="bg-surface-2">{children}</thead>
}

/**
 * hover는 tbody 행에만 걸린다 — 헤더 행까지 반응하면 클릭 가능해 보인다.
 * `TableEmpty`가 렌더링하는 빈 상태 행은 `data-empty-row`로 표시해 제외한다 —
 * 클릭 가능한 요소가 아닌데 hover 시 배경이 tint되면 오해를 준다.
 */
export function TBody({ children }: { children: React.ReactNode }) {
  return <tbody className="[&_tr:not([data-empty-row]):hover]:bg-surface-3/50">{children}</tbody>
}

export function TR({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <tr className={`border-b border-border last:border-b-0 ${className ?? ''}`}>{children}</tr>
  )
}

export function TH({
  children,
  align = 'left',
}: {
  children?: React.ReactNode
  align?: 'left' | 'right'
}) {
  return (
    <th
      className={`px-3 py-2.5 text-[12px] font-medium tracking-wide text-fg-subtle ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      {children}
    </th>
  )
}

export function TD({
  children,
  align = 'left',
  className,
}: {
  children?: React.ReactNode
  align?: 'left' | 'right'
  className?: string
}) {
  return (
    <td
      className={`px-3 py-2.5 align-middle ${
        align === 'right' ? 'text-right tnum' : 'text-left'
      } ${className ?? ''}`}
    >
      {children}
    </td>
  )
}

/** 목록이 비었을 때 표 안에 그대로 넣는 행. */
export function TableEmpty({
  colSpan,
  title,
  description,
}: {
  colSpan: number
  title: string
  description?: string
}) {
  return (
    <tr data-empty-row>
      <td colSpan={colSpan}>
        <EmptyState title={title} description={description} />
      </td>
    </tr>
  )
}
