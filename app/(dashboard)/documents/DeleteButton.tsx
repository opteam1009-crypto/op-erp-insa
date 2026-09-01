'use client'

import { Button } from '@/components/ui/Button'

export function DeleteButton({ id }: { id: string }) {
  return (
    <Button
      type="button"
      variant="danger"
      size="sm"
      onClick={async () => {
        await fetch(`/api/documents/${id}`, { method: 'DELETE' })
        window.location.reload()
      }}
    >
      삭제
    </Button>
  )
}
