import type { InputHTMLAttributes, SelectHTMLAttributes } from 'react'

// py-2(16px) + border(2px) + leading-[18px] = 36px, matching buttonClass's md
// height (h-9). Without an explicit leading, this inherits body's line-height
// 1.55 and lands at ~39px, 3px taller than the buttons it sits next to in
// inline filter bars (profit-loss, franchise-stores create form).
const CONTROL =
  'w-full rounded-md border border-border-strong bg-surface px-2.5 py-2 text-[13.5px] leading-[18px] text-fg ' +
  'placeholder:text-fg-subtle transition-colors ' +
  'focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg ' +
  'disabled:opacity-50'

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label: string
  htmlFor?: string
  hint?: string
  error?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ''}`}>
      <label htmlFor={htmlFor} className="text-[12px] font-medium text-fg-muted">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-[12px] text-fg-subtle">{hint}</p>}
      {error && <p className="text-[12px] text-negative">{error}</p>}
    </div>
  )
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${CONTROL} ${className ?? ''}`} />
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${CONTROL} ${className ?? ''}`} />
}

/**
 * 파일 입력은 브라우저 기본 위젯 모양이 제각각이라 ::file-selector-button만
 * 다시 칠하고 나머지는 컨트롤 스타일을 공유한다.
 */
export function FileInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      type="file"
      className={
        'w-full rounded-md border border-dashed border-border-strong bg-surface-2 px-2.5 py-2 text-[13.5px] text-fg-muted ' +
        'file:mr-3 file:rounded file:border-0 file:bg-surface-3 file:px-2.5 file:py-1 ' +
        'file:text-[12px] file:font-medium file:text-fg ' +
        'focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg ' +
        (className ?? '')
      }
    />
  )
}
