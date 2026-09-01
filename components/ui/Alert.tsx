const VARIANT_CLASS = {
  error: 'border-negative/30 bg-negative/8 text-negative',
  success: 'border-positive/30 bg-positive/8 text-positive',
  info: 'border-border bg-surface-2 text-fg-muted',
} as const

export type AlertVariant = keyof typeof VARIANT_CLASS

export function Alert({
  variant = 'info',
  children,
  className,
}: {
  variant?: AlertVariant
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      role="alert"
      className={`rounded-md border px-3 py-2 text-[13.5px] ${VARIANT_CLASS[variant]} ${className ?? ''}`}
    >
      {children}
    </div>
  )
}
