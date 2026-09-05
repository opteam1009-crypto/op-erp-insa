'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const NAMES = ['dept', 'title', 'type', 'status', 'q'] as const

/** 한 글자 칠 때마다 조회하지 않도록 기다리는 시간. */
const SEARCH_DEBOUNCE_MS = 300

interface Option {
  value: string
  label: string
}

/**
 * 필터 하나. 보이는 것은 칩이고, 그 위에 투명한 <select>가 덮여 있다.
 *
 * appearance-none으로 네이티브 위젯을 지우고 다시 칠하는 대신 이 방식을 쓰는
 * 이유는, 열었을 때 뜨는 목록이 OS가 그리는 그대로 남기 때문이다 — 모바일에서는
 * 휠 피커가, 데스크톱에서는 키보드 타이핑 탐색이 공짜로 따라온다. 직접 그린
 * 드롭다운으로 바꾸면 그걸 전부 다시 만들어야 한다.
 */
function FilterChip({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string
  value: string
  options: Option[]
  disabled: boolean
  onChange: (value: string) => void
}) {
  const active = Boolean(value)
  const selected = options.find((o) => o.value === value)

  return (
    <span
      className={[
        'relative inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px]',
        'transition-colors',
        active
          ? 'bg-accent/12 text-accent'
          : 'bg-surface-2 text-fg-muted hover:bg-surface-3 hover:text-fg',
        // 덮여 있는 select가 포커스를 받으면 칩에 링을 그린다. 투명한 컨트롤이라
        // 이게 없으면 키보드로 어디에 있는지 알 수 없다.
        'focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2 focus-within:ring-offset-bg',
        disabled ? 'opacity-50' : '',
      ].join(' ')}
    >
      <span className={active ? 'text-accent/70' : 'text-fg-subtle'}>{label}</span>
      <span className="font-medium">{selected?.label ?? '전체'}</span>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
        <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <select
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-default"
      >
        <option value="">전체</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </span>
  )
}

export function EmployeeFilters({
  departments,
  jobTitles,
  employmentTypes,
  statuses,
}: {
  departments: { id: string; name: string }[]
  jobTitles: string[]
  employmentTypes: readonly string[]
  statuses: readonly string[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()

  const current = (name: string) => searchParams.get(name) ?? ''
  const filtered = NAMES.some((n) => current(n))

  // 입력값은 URL이 아니라 여기에 있다. 타이핑마다 URL을 갈아치우면 조회가
  // 도는 동안 커서와 입력이 되감긴다.
  const [text, setText] = useState(current('q'))

  function go(query: string) {
    // replace라서 필터를 몇 번 돌려도 뒤로가기에 그만큼 쌓이지 않는다. 목록을
    // 훑다 나가려면 뒤로가기를 한 번만 누르면 된다.
    startTransition(() => router.replace(query ? `/employees?${query}` : '/employees'))
  }

  function apply(name: string, value: string) {
    const params = new URLSearchParams(searchParams)
    if (value) params.set(name, value)
    else params.delete(name)
    go(params.toString())
  }

  // 입력이 멎으면 URL에 반영한다. 반영된 뒤에는 text와 URL이 같아져 다시 돌지
  // 않는다 — 이 비교가 없으면 조회가 끝날 때마다 스스로를 또 부른다.
  useEffect(() => {
    const applied = searchParams.get('q') ?? ''
    if (text.trim() === applied) return
    const timer = setTimeout(() => apply('q', text.trim()), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, searchParams])

  const chips: [string, string, Option[]][] = [
    ['dept', '부서', departments.map((d) => ({ value: d.id, label: d.name }))],
    ['title', '직책', jobTitles.map((t) => ({ value: t, label: t }))],
    ['type', '근로형태', employmentTypes.map((t) => ({ value: t, label: t }))],
    ['status', '재직상태', statuses.map((s) => ({ value: s, label: s }))],
  ]

  return (
    // form이 아니라 div다. 고르는 즉시 URL이 바뀌므로 제출할 것이 없다.
    <div aria-busy={pending} className="flex flex-wrap items-center gap-1.5">
      <span className="relative inline-flex items-center gap-1.5 rounded-md bg-surface-2 px-2.5 py-1.5 text-[13px] focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2 focus-within:ring-offset-bg">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0 text-fg-subtle">
          <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2" />
          <path d="m16 16 4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="이름 검색"
          aria-label="이름 검색"
          className="w-32 bg-transparent text-fg placeholder:text-fg-subtle focus:outline-none"
        />
      </span>

      {chips.map(([name, label, options]) => (
        <FilterChip
          key={name}
          label={label}
          value={current(name)}
          options={options}
          disabled={pending}
          onChange={(value) => apply(name, value)}
        />
      ))}

      {filtered && (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setText('')
            go('')
          }}
          className="ml-1 inline-flex items-center gap-1 rounded px-1.5 py-1 text-[12px] text-fg-subtle transition-colors hover:text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          초기화
        </button>
      )}
    </div>
  )
}
