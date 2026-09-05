'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createEmployee } from '../actions'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Field, Input, Select } from '@/components/ui/Field'
import { POSITIONS } from '@/lib/validation/employee'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'

export interface DepartmentOption {
  id: string
  name: string
}

/**
 * 제목은 이 폼이 그리지 않는다 — 컨테이너가 정한다. 전용 페이지에서는
 * PageHeader가, 모달에서는 모달 제목이 그 역할을 한다. 폼은 필드와 제출만
 * 책임진다.
 *
 * onDone은 저장 성공 후 무엇을 할지 컨테이너가 결정하게 한다. 기본값은
 * 사원 목록으로 이동하는 기존 동작이고, 모달은 자신을 닫고 목록을 갱신한다.
 */
export function NewEmployeeForm({
  departments,
  onDone,
}: {
  departments: DepartmentOption[]
  onDone?: () => void
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    const input = {
      employee_number: String(formData.get('employee_number') ?? ''),
      name: String(formData.get('name') ?? ''),
      department_id: (formData.get('department_id') as string) || null,
      position: String(formData.get('position') ?? ''),
      employment_type: formData.get('employment_type') as '정규직' | '계약직' | '인턴' | '프리랜서',
      hire_date: String(formData.get('hire_date') ?? ''),
      birth_date: String(formData.get('birth_date') ?? ''),
      phone: String(formData.get('phone') ?? ''),
      emergency_contact: String(formData.get('emergency_contact') ?? ''),
      contract_announce_date: String(formData.get('contract_announce_date') ?? ''),
      salary_review_date: String(formData.get('salary_review_date') ?? ''),
      salary_announce_date: String(formData.get('salary_announce_date') ?? ''),
    }

    const result = await createEmployee(input)
    if (result.error) {
      setError(result.error)
      return
    }
    setError(null)
    if (onDone) onDone()
    else router.push('/employees')
  }

  return (
    <form action={handleSubmit} className="max-w-3xl">
      <div className="flex flex-col gap-4">
        {error && <Alert variant="error">{error}</Alert>}

        <Card>
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
          </CardHeader>
          <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="사번" htmlFor="employee_number">
              <Input id="employee_number" name="employee_number" required />
            </Field>
            <Field label="이름" htmlFor="name">
              <Input id="name" name="name" required />
            </Field>
            <Field label="생년월일" htmlFor="birth_date">
              <Input id="birth_date" type="date" name="birth_date" />
            </Field>
            <Field label="연락처" htmlFor="phone">
              <Input id="phone" name="phone" />
            </Field>
            <Field label="비상연락망" htmlFor="emergency_contact" className="sm:col-span-2">
              <Input id="emergency_contact" name="emergency_contact" />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>근로 정보</CardTitle>
          </CardHeader>
          <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="부서" htmlFor="department_id">
              <Select id="department_id" name="department_id" defaultValue="">
                <option value="">부서 미지정</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="직급" htmlFor="position">
              <Select id="position" name="position" defaultValue="사원">
                <option value="">선택 안 함</option>
                {POSITIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="근로형태" htmlFor="employment_type">
              <Select id="employment_type" name="employment_type" required>
                <option value="정규직">정규직</option>
                <option value="계약직">계약직</option>
                <option value="인턴">인턴</option>
                <option value="프리랜서">프리랜서</option>
              </Select>
            </Field>
            <Field label="입사일" htmlFor="hire_date">
              <Input id="hire_date" type="date" name="hire_date" required />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>일정</CardTitle>
          </CardHeader>
          <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <p className="text-[12px] text-fg-subtle sm:col-span-2">
              정규직전환 평가일은 입사일 기준 3개월 후로 자동 계산됩니다 (등록 후 필요시 수정 가능).
            </p>
            <Field label="정규직전환 발표일" htmlFor="contract_announce_date">
              <Input id="contract_announce_date" type="date" name="contract_announce_date" />
            </Field>
            <Field label="연봉협상 평가일" htmlFor="salary_review_date">
              <Input id="salary_review_date" type="date" name="salary_review_date" />
            </Field>
            <Field label="연봉협상 발표일" htmlFor="salary_announce_date">
              <Input id="salary_announce_date" type="date" name="salary_announce_date" />
            </Field>
          </CardBody>
        </Card>

        <div className="flex justify-end">
          <Button type="submit">저장</Button>
        </div>
      </div>
    </form>
  )
}
