'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { buttonClass } from '@/lib/ui/button-class'
import { deleteExtraWork } from './actions'

/** 잘못 올린 대상자를 이달 목록에서 지운다. 받아 둔 서류 파일도 함께 지워진다. */
export function DeleteRowButton({ id, name }: { id: string; name: string }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  return (
    <div className="flex flex-col items-end">
      <button
        type="button"
        aria-label={`${name} 대상에서 제거`}
        title="대상에서 제거"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(`${name}님을 이달 대상에서 지울까요? 올린 서류도 함께 지워집니다.`)) return
          startTransition(async () => {
            const result = await deleteExtraWork(id)
            if (result.error) {
              setError(result.error)
              return
            }
            router.refresh()
          })
        }}
        className={buttonClass('danger', 'icon')}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
          <path d="M5 7h14M10 11v6M14 11v6M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {error && (
        <p role="alert" className="mt-0.5 text-[11px] text-negative">
          {error}
        </p>
      )}
    </div>
  )
}
