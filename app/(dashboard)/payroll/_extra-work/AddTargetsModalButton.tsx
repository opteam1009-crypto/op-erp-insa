'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import type { ExtraWorkKind } from '@/lib/extra-work/extra-work'
import { addExtraWorkTargets } from './actions'

export interface TargetCandidate {
  id: string
  employee_number: string
  name: string
  department_name: string | null
  status: string
}

/**
 * 이달 대상자를 고르는 모달. 부서별로 묶은 체크 목록이다 — 요청도 확인도
 * 팀 단위로 도는 일이라 팀 단위로 훑는 게 빠르다.
 */
export function AddTargetsModalButton({
  kind,
  period,
  label,
  candidates,
  existingIds,
}: {
  kind: ExtraWorkKind
  period: string
  /** "2026년 9월" */
  label: string
  candidates: TargetCandidate[]
  /** 이미 이달 대상에 올라간 사원. 체크된 채 비활성으로 보인다. */
  existingIds: string[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const existing = useMemo(() => new Set(existingIds), [existingIds])

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const map = new Map<string, TargetCandidate[]>()
    for (const c of candidates) {
      if (q && !c.name.toLowerCase().includes(q) && !c.employee_number.includes(q)) continue
      const key = c.department_name ?? '부서 미지정'
      ;(map.get(key) ?? map.set(key, []).get(key)!).push(c)
    }
    return [...map.entries()]
  }, [candidates, query])

  function close() {
    setOpen(false)
    setSelected([])
    setQuery('')
    setError(null)
  }

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function submit() {
    startTransition(async () => {
      const result = await addExtraWorkTargets({ kind, period, employeeIds: selected })
      if (result.error) {
        setError(result.error)
        return
      }
      close()
      // 목록은 서버 컴포넌트가 그리므로 다시 그려야 새 대상이 보인다.
      router.refresh()
    })
  }

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        + 대상 추가
      </Button>
      <Modal
        open={open}
        onClose={close}
        title={`${label} ${kind} 대상 추가`}
        description="이달 해당 근무를 한 사원을 고르세요. 이미 올라간 사원은 흐리게 보입니다."
      >
        <div className="flex flex-col gap-3">
          {error && <Alert variant="error">{error}</Alert>}

          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="이름·사번 검색"
            aria-label="이름·사번 검색"
            className="w-full rounded-md border border-border-strong bg-surface px-2.5 py-2 text-[13.5px] leading-[18px] text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg"
          />

          <div className="max-h-[50vh] overflow-y-auto rounded-md border border-border">
            {groups.length === 0 && (
              <p className="px-3 py-6 text-center text-[12px] text-fg-subtle">검색 결과가 없습니다.</p>
            )}
            {groups.map(([department, people]) => (
              <div key={department}>
                <div className="sticky top-0 border-b border-border bg-surface-2 px-3 py-1.5 text-[11px] font-medium tracking-wider text-fg-subtle">
                  {department}
                </div>
                <ul className="divide-y divide-border">
                  {people.map((person) => {
                    const already = existing.has(person.id)
                    return (
                      <li key={person.id}>
                        <label
                          className={[
                            'flex items-center gap-3 px-3 py-2 text-[13.5px]',
                            already ? 'opacity-50' : 'cursor-pointer hover:bg-surface-2',
                          ].join(' ')}
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-accent"
                            checked={already || selected.includes(person.id)}
                            disabled={already || pending}
                            onChange={() => toggle(person.id)}
                          />
                          <span className="tnum w-12 text-[12px] text-fg-subtle">
                            {person.employee_number}
                          </span>
                          <span className="font-medium text-fg">{person.name}</span>
                          {/* 퇴사자도 고를 수 있다. 말일 정산 전에 나간 사람의 근무도
                              정산 대상이다. 다만 상태를 보여 실수로 고르지 않게 한다. */}
                          {person.status !== '재직' && <Badge status={person.status}>{person.status}</Badge>}
                          {already && <span className="ml-auto text-[12px] text-fg-subtle">이미 추가됨</span>}
                        </label>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="tnum text-[12px] text-fg-muted">{selected.length}명 선택</span>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={close} disabled={pending}>
                취소
              </Button>
              <Button type="button" onClick={submit} disabled={selected.length === 0 || pending}>
                {pending ? '추가 중…' : `${selected.length}명 추가`}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  )
}
