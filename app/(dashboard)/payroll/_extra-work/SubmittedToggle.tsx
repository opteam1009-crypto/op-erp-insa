'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { TONE_CLASS } from '@/components/ui/Badge'
import { toneForStatus } from '@/lib/ui/badge-tone'
import { setExtraWorkSubmitted } from './actions'

/**
 * 제출/미제출 배지. 누르면 뒤집힌다. 파일을 올리면 라우트가 제출로 찍으므로,
 * 이 버튼은 종이로 받았을 때와 실수를 되돌릴 때 쓴다.
 */
export function SubmittedToggle({ id, submittedOn }: { id: string; submittedOn: string | null }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const submitted = submittedOn !== null
  const status = submitted ? '제출' : '미제출'

  return (
    <div className="min-w-0">
      <button
        type="button"
        aria-pressed={submitted}
        disabled={pending}
        title={submitted ? `${submittedOn}에 받음. 누르면 미제출로 되돌립니다.` : '누르면 제출로 표시합니다.'}
        onClick={() =>
          startTransition(async () => {
            const result = await setExtraWorkSubmitted(id, !submitted)
            if (result.error) {
              setError(result.error)
              return
            }
            setError(null)
            router.refresh()
          })
        }
        className={[
          'inline-flex items-center rounded-full px-2 py-0.5 text-[12px] font-medium transition-opacity hover:opacity-80',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
          TONE_CLASS[toneForStatus(status)],
          pending ? 'opacity-50' : '',
        ].join(' ')}
      >
        {status}
      </button>
      {submitted && <p className="tnum mt-0.5 text-[11px] text-fg-subtle">{submittedOn}</p>}
      {error && (
        <p role="alert" className="mt-0.5 text-[11px] text-negative">
          {error}
        </p>
      )}
    </div>
  )
}
