'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Field, Input, Select, FileInput } from '@/components/ui/Field'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'

export interface FranchiseStoreOption {
  id: string
  name: string
}

export function DocumentUploadForm({ franchiseStores }: { franchiseStores: FranchiseStoreOption[] }) {
  const [message, setMessage] = useState<string | null>(null)

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const response = await fetch('/api/documents/upload', { method: 'POST', body: formData })
    const result = await response.json()
    setMessage(result.error ?? '업로드 완료')
    if (!result.error) e.currentTarget.reset()
  }

  const now = new Date()

  return (
    <div className="max-w-2xl">
      <PageHeader title="증빙 업로드" />
      <form onSubmit={handleUpload} className="flex flex-col gap-4">
        {message && (
          <Alert variant={message === '업로드 완료' ? 'success' : 'error'}>{message}</Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>증빙 정보</CardTitle>
          </CardHeader>
          <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="증빙 유형" htmlFor="doc_type">
              <Select id="doc_type" name="doc_type" required>
                <option value="세금계산서">세금계산서</option>
                <option value="계산서">계산서</option>
                <option value="신용카드">신용카드</option>
                <option value="현금영수증">현금영수증</option>
                <option value="기타">기타</option>
              </Select>
            </Field>
            <Field label="거래 구분" htmlFor="transaction_type">
              <Select id="transaction_type" name="transaction_type" required>
                <option value="매출">매출</option>
                <option value="매입">매입</option>
              </Select>
            </Field>
            <Field label="연도" htmlFor="year">
              <Input id="year" type="number" name="year" defaultValue={now.getFullYear()} required />
            </Field>
            <Field label="월" htmlFor="month">
              <Input
                id="month"
                type="number"
                name="month"
                min={1}
                max={12}
                defaultValue={now.getMonth() + 1}
                required
              />
            </Field>
            <Field label="거래처" htmlFor="vendor_name">
              <Input id="vendor_name" name="vendor_name" />
            </Field>
            <Field label="금액" htmlFor="amount">
              <Input id="amount" type="number" name="amount" min={1} step="1" required />
            </Field>
            <Field label="가맹점" htmlFor="franchise_store_id" hint="선택 사항" className="sm:col-span-2">
              <Select id="franchise_store_id" name="franchise_store_id" defaultValue="">
                <option value="">가맹점 미지정</option>
                {franchiseStores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </Select>
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>파일</CardTitle>
          </CardHeader>
          <CardBody>
            <Field label="증빙 파일" htmlFor="file" hint=".pdf, .jpg, .jpeg, .png, .xlsx, .xls">
              <FileInput
                id="file"
                name="file"
                accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls"
                required
              />
            </Field>
          </CardBody>
        </Card>

        <div className="flex justify-end">
          <Button type="submit">업로드</Button>
        </div>
      </form>
    </div>
  )
}
