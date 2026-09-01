export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <div
        aria-hidden
        className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-surface-3 text-fg-subtle"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
          <path d="M4 7h16M4 12h16M4 17h9" strokeLinecap="round" />
        </svg>
      </div>
      <p className="text-[13.5px] font-medium text-fg">{title}</p>
      {description && <p className="max-w-sm text-[12px] text-fg-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
