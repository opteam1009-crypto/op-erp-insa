'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateEmployeeField, type InlineField } from './actions'
import { TONE_CLASS } from '@/components/ui/Badge'
import { toneForStatus } from '@/lib/ui/badge-tone'

const CONTROL =
  'w-full rounded border border-transparent bg-transparent px-1.5 py-1 text-[13px] text-fg ' +
  'transition-colors hover:border-border-strong hover:bg-surface-2 ' +
  'focus:border-accent focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent ' +
  'disabled:opacity-50'

interface Props {
  id: string
  field: InlineField
  value: string
  /** select면 고를 값들. 저장되는 value와 화면에 보이는 label을 나눠 받는다. */
  options?: { value: string; label: string }[]
  type?: 'text' | 'date'
  placeholder?: string
  /** 'badge'면 배지 모양으로 그린다. 값 자체가 상태인 열(재직상태)은 목록을
   *  훑을 때 색으로 먼저 읽히는데, 보통 셀렉트로는 그 덩어리가 안 보인다. */
  variant?: 'plain' | 'badge'
}

export function InlineCell({
  id,
  field,
  value,
  options,
  type = 'text',
  placeholder,
  variant = 'plain',
}: Props) {
  const router = useRouter()
  const [current, setCurrent] = useState(value)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function save(next: string) {
    // 안 바뀐 값으로 서버를 두드리지 않는다. 날짜/텍스트는 blur마다 불린다.
    if (next === value) return
    startTransition(async () => {
      const result = await updateEmployeeField(id, field, next)
      if (result.error) {
        setError(result.error)
        setCurrent(value) // 저장 못 했으면 화면도 되돌린다. 반영된 것처럼 보이면 안 된다.
        return
      }
      setError(null)
      router.refresh()
    })
  }

  const shared = {
    disabled: pending,
    'aria-invalid': error ? true : undefined,
    // 펼친 목록은 OS가 그리면서 select의 color를 물려받는다. 배지 색이 항목
    // 글자까지 번지지 않도록 여기서 끊는다.
    className: `${CONTROL} [&>option]:bg-surface [&>option]:text-fg ${
      type === 'date' ? 'date-bare' : ''
    } ${error ? 'border-negative' : ''}`,
  }

  // 배지 위에 투명한 select를 덮는다. 필터 칩과 같은 방식이다 — 닫힌 모습만
  // 다시 칠하고, 열리는 목록은 OS가 그리는 것을 그대로 쓴다.
  if (variant === 'badge' && options) {
    const selected = options.find((o) => o.value === current)
    return (
      <div className="min-w-0">
        <span
          className={[
            'relative inline-flex items-center gap-1 rounded-full px-2 py-0.5',
            'text-[12px] font-medium transition-opacity',
            TONE_CLASS[toneForStatus(current)],
            'focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2 focus-within:ring-offset-bg',
            pending ? 'opacity-50' : '',
          ].join(' ')}
        >
          {selected?.label ?? current}
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
            <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <select
            aria-label={placeholder ?? '값 선택'}
            value={current}
            disabled={pending}
            onChange={(e) => {
              setCurrent(e.target.value)
              save(e.target.value)
            }}
            className="absolute inset-0 cursor-pointer text-fg opacity-0 [&>option]:bg-surface [&>option]:text-fg"
          >
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </span>
        {error && (
          <p role="alert" className="mt-0.5 text-[11px] text-negative">
            {error}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="min-w-0">
      {options ? (
        <select
          {...shared}
          value={current}
          onChange={(e) => {
            setCurrent(e.target.value)
            save(e.target.value)
          }}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          {...shared}
          type={type}
          value={current}
          placeholder={placeholder}
          onChange={(e) => setCurrent(e.target.value)}
          // 달력 아이콘을 CSS로 숨겼으므로(.date-bare) 칸 자체가 달력을 연다.
          // showPicker는 사용자 제스처 안에서만 허용되고, 지원하지 않는
          // 브라우저에서는 그냥 타이핑으로 입력하면 된다.
          onClick={(e) => {
            if (type === 'date') e.currentTarget.showPicker?.()
          }}
          // 날짜는 달력에서 고르면 곧바로, 텍스트는 다 치고 벗어날 때 저장한다.
          onBlur={(e) => save(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
            if (e.key === 'Escape') {
              setCurrent(value)
              e.currentTarget.blur()
            }
          }}
        />
      )}
      {error && (
        <p role="alert" className="mt-0.5 px-1.5 text-[11px] text-negative">
          {error}
        </p>
      )}
    </div>
  )
}
