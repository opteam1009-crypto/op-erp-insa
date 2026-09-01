'use client'

import { useState } from 'react'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Field, Input, Select, FileInput } from '@/components/ui/Field'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'

export interface FranchiseStoreOption {
  id: string
  name: string
}

/**
 * 제목은 이 폼이 그리지 않는다 — 컨테이너가 정한다. 전용 페이지에서는
 * PageHeader가, 모달에서는 모달 제목이 그 역할을 한다.
 *
 * onDone은 업로드 성공 후 무엇을 할지 컨테이너가 결정하게 한다. 전용
 * 페이지는 폼을 비우고 그대로 머물러 연속 업로드를 할 수 있게 하고,
 * 모달은 자신을 닫고 증빙 목록을 갱신한다.
 */
export function DocumentUploadForm({
  franchiseStores,
  onDone,
}: {
  franchiseStores: FranchiseStoreOption[]
  onDone?: () => void
}) {
  const [message, setMessage] = useState<string | null>(null)

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    // await 뒤에는 e.currentTarget이 이미 null이므로 지금 잡아 둔다.
    const form = e.currentTarget
    const formData = new FormData(form)
    const response = await fetch('/api/documents/upload', { method: 'POST', body: formData })
    const result = await response.json()
    if (result.error) {
      setMessage(result.error)
      return
    }
    form.reset()
    if (onDone) onDone()
    else setMessage('업로드 완료')
  }

  const now = new Date()

  return (
    <div>
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
