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

export function CardBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`px-4 py-4 ${className ?? ''}`}>{children}</div>
}
