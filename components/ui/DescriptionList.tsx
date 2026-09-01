export interface DescriptionItem {
  label: string
  value: React.ReactNode
}

export function DescriptionList({ items }: { items: DescriptionItem[] }) {
  return (
    // 단일 컬럼(모바일)에서는 DOM 마지막 자식이 곧 마지막 행이라 last-child로
    // 충분하다. sm 이상 2열 그리드에서는 마지막 "행"이 마지막 두 자식이므로
    // nth-last-child(-n+2)로 그 둘 모두에서 밑줄을 뗀다. dt/dd가 아니라 행
    // 래퍼 div에 적용해야 하므로 컨테이너(dl)에서 자식 선택자로 지정한다.
    <dl className="grid grid-cols-1 gap-x-8 gap-y-0 sm:grid-cols-2 [&>div:last-child]:border-b-0 sm:[&>div:nth-last-child(-n+2)]:border-b-0">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-baseline justify-between gap-4 border-b border-border py-2.5"
        >
          <dt className="shrink-0 text-[12px] font-medium text-fg-subtle">{item.label}</dt>
          <dd className="text-right text-[13.5px] text-fg">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}
