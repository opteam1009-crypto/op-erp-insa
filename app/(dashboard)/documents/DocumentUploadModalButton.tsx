'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { DocumentUploadForm, type FranchiseStoreOption } from './upload/DocumentUploadForm'

/**
 * 목록 위에서 증빙을 올린다. /documents/upload 페이지는 그대로 살아 있고
 * 같은 폼 컴포넌트를 렌더링한다.
 */
export function DocumentUploadModalButton({
  franchiseStores,
}: {
  franchiseStores: FranchiseStoreOption[]
}) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        + 증빙 업로드
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="증빙 업로드"
        description="업로드하면 목록이 바로 갱신됩니다."
      >
        <DocumentUploadForm
          franchiseStores={franchiseStores}
          onDone={() => {
            setOpen(false)
            // 목록은 서버 컴포넌트가 그리므로 다시 그려야 새 증빙이 보인다.
            router.refresh()
          }}
        />
      </Modal>
    </>
  )
}
