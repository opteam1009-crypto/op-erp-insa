'use client'

export function DeleteButton({ id }: { id: string }) {
  return (
    <button
      onClick={async () => {
        await fetch(`/api/documents/${id}`, { method: 'DELETE' })
        window.location.reload()
      }}
      className="text-red-600"
    >
      삭제
    </button>
  )
}
