'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createFranchiseStore } from './actions'
import { Card, CardBody } from '@/components/ui/Card'
import { Field, Input } from '@/components/ui/Field'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'

export function CreateFranchiseStoreForm() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    const input = { name: String(formData.get('name') ?? '') }
    const result = await createFranchiseStore(input)
    if (result.error) {
      setError(result.error)
      return
    }
    setError(null)
    router.refresh()
  }

  return (
    <Card className="mb-4">
      <CardBody padding="snug">
        <form action={handleSubmit} className="flex flex-wrap items-end gap-3">
          <Field label="가맹점명" htmlFor="name" className="min-w-[220px] flex-1">
            <Input id="name" name="name" required />
          </Field>
          <Button type="submit">추가</Button>
        </form>
        {error && (
          <Alert variant="error" className="mt-3">
            {error}
          </Alert>
        )}
      </CardBody>
    </Card>
  )
}
