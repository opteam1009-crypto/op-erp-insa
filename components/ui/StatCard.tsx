const TONE_CLASS = {
  neutral: 'text-fg',
  positive: 'text-positive',
  negative: 'text-negative',
} as const

export type StatTone = keyof typeof TONE_CLASS

export function StatCard({
  label,
  value,
  tone = 'neutral',
  hint,
}: {
  label: string
  value: string
  tone?: StatTone
  hint?: string
}) {
  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-3.5">
      <p className="text-[12px] font-medium text-fg-subtle">{label}</p>
      <p className={`mt-1.5 text-[22px] font-semibold tracking-tight tnum ${TONE_CLASS[tone]}`}>
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[12px] text-fg-subtle">{hint}</p>}
    </div>
  )
}
