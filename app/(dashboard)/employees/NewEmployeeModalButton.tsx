'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { NewEmployeeForm, type DepartmentOption } from './new/NewEmployeeForm'

/**
 * 목록 위에서 사원을 등록한다. /employees/new 페이지는 그대로 살아 있고
 * 같은 폼 컴포넌트를 렌더링한다 — 딥링크와 엑셀 일괄등록 페이지의 링크가
 * 거기로 향한다.
 */
export function NewEmployeeModalButton({ departments }: { departments: DepartmentOption[] }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        + 사원 등록
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="사원 등록"
        description="저장하면 목록이 바로 갱신됩니다."
      >
        <NewEmployeeForm
          departments={departments}
          onDone={() => {
            setOpen(false)
            // 목록은 서버 컴포넌트가 그리므로 다시 그려야 새 사원이 보인다.
            router.refresh()
          }}
        />
      </Modal>
    </>
  )
}
