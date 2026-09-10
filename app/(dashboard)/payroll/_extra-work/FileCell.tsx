'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { buttonClass } from '@/lib/ui/button-class'
import { EXTRA_WORK_FILE_ACCEPT } from '@/lib/validation/extra-work'

/**
 * 제출 서류 칸. 파일이 있으면 이름이 링크이고, 없으면 '없음'이다. 올리기는
 * 숨긴 file input을 버튼으로 연다 — 표 한 줄에 파일 위젯을 그대로 두면 그것만
 * 보인다.
 *
 * 링크는 Next 페이지가 아니라 API 라우트라 <a>다. 라우트가 세션을 확인한 뒤
 * Blob에서 읽어 흘려보낸다.
 */
export function FileCell({ id, fileName }: { id: string; fileName: string | null }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const url = `/api/extra-work/${id}/file`

  async function upload(file: File) {
    setBusy(true)
    setError(null)
    const body = new FormData()
    body.set('file', file)
    try {
      const response = await fetch(url, { method: 'POST', body })
      const result = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok || result.error) {
        setError(result.error ?? '업로드에 실패했습니다')
        return
      }
      router.refresh()
    } catch {
      setError('업로드에 실패했습니다')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-w-0">
      <div className="flex min-w-0 items-center gap-1.5">
        {fileName ? (
          <a
            href={url}
            target="_blank"
            rel="noopener"
            title={fileName}
            className="min-w-0 truncate text-[13px] text-accent hover:underline"
          >
            {fileName}
          </a>
        ) : (
          <span className="text-[12px] text-fg-subtle">없음</span>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className={buttonClass('ghost', 'sm', 'shrink-0')}
        >
          {busy ? '올리는 중…' : fileName ? '교체' : '올리기'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={EXTRA_WORK_FILE_ACCEPT}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) upload(file)
            // 같은 파일을 다시 골라도 change가 나도록 비운다.
            e.target.value = ''
          }}
        />
      </div>
      {error && (
        <p role="alert" className="mt-0.5 text-[11px] text-negative">
          {error}
        </p>
      )}
    </div>
  )
}
