export interface DescriptionItem {
  label: string
  value: React.ReactNode
}

export function DescriptionList({ items }: { items: DescriptionItem[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-8 gap-y-0 sm:grid-cols-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-baseline justify-between gap-4 border-b border-border py-2.5 last:border-b-0"
        >
          <dt className="shrink-0 text-[12px] font-medium text-fg-subtle">{item.label}</dt>
          <dd className="text-right text-[13.5px] text-fg">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}
