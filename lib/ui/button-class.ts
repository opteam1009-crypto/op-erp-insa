export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'icon'

const BASE =
  'inline-flex items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap transition-colors ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ' +
  'disabled:pointer-events-none disabled:opacity-50'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-accent-fg hover:bg-accent/90',
  secondary: 'border border-border-strong bg-surface text-fg hover:bg-surface-3',
  ghost: 'text-fg-muted hover:bg-surface-3 hover:text-fg',
  danger: 'text-negative hover:bg-negative/10',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-2.5 text-[12.5px]',
  md: 'h-9 px-3.5 text-[13.5px]',
  icon: 'h-8 w-8 p-0 text-[13px]',
}

/**
 * <button>과 <Link>가 같은 모양을 갖도록 클래스 문자열만 만들어 준다.
 * Button 컴포넌트도 내부적으로 이걸 쓴다.
 */
export function buttonClass(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  extra?: string,
): string {
  return [BASE, VARIANTS[variant], SIZES[size], extra].filter(Boolean).join(' ')
}
