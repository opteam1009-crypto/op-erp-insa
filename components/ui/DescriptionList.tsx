export interface DescriptionItem {
  label: string
  value: React.ReactNode
}

export function DescriptionList({ items }: { items: DescriptionItem[] }) {
  return (
    // 마지막 "시각적" 행에서만 밑줄을 뗀다. 단일 컬럼(모바일)에서는 DOM
    // 마지막 자식이 곧 마지막 행이다.
    //
    // sm 이상 2열에서는 항목 수의 홀짝에 따라 마지막 행의 크기가 다르다.
    // 항목이 짝수면 마지막 행은 자식 두 개, 홀수면 하나다. 그래서
    // nth-last-child(-n+2)로 뭉뚱그리면 홀수일 때 뒤에서 두 번째 항목까지
    // 밑줄이 벗겨지는데, 그 항목은 마지막 행이 아니라 그 앞 행에 있고
    // 짝인 항목은 밑줄을 유지하므로 한쪽만 그어진 행이 생긴다.
    //
    // nth-last-child(2):nth-child(odd)는 "뒤에서 두 번째이면서 왼쪽 열"일
    // 때만 걸린다 — 그건 항목 수가 짝수라 그 둘이 같은 마지막 행일 때뿐이다.
    // dt/dd가 아니라 행 래퍼 div가 대상이므로 컨테이너(dl)에서 지정한다.
    <dl className="grid grid-cols-1 gap-x-8 gap-y-0 sm:grid-cols-2 [&>div:last-child]:border-b-0 sm:[&>div:nth-last-child(2):nth-child(odd)]:border-b-0">
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
