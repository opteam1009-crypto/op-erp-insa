'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateEmployeeField, type InlineField } from './actions'

const CONTROL =
  'w-full rounded border border-transparent bg-transparent px-1.5 py-1 text-[13px] text-fg ' +
  'transition-colors hover:border-border-strong hover:bg-surface-2 ' +
  'focus:border-accent focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent ' +
  'disabled:opacity-50'

/** 재직상태는 목록을 훑을 때 색으로 먼저 읽힌다. 셀렉트로 바꿔도 그 색은 남긴다. */
const STATUS_CLASS: Record<string, string> = {
  재직: 'text-positive',
  휴직: 'text-warning',
  퇴사: 'text-negative',
}

interface Props {
  id: string
  field: InlineField
  value: string
  /** select면 고를 값들. 저장되는 value와 화면에 보이는 label을 나눠 받는다. */
  options?: { value: string; label: string }[]
  type?: 'text' | 'date'
  placeholder?: string
}

export function InlineCell({ id, field, value, options, type = 'text', placeholder }: Props) {
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
    className: `${CONTROL} ${field === 'status' ? STATUS_CLASS[current] ?? '' : ''} ${
      type === 'date' ? 'date-bare' : ''
    } ${error ? 'border-negative' : ''}`,
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
