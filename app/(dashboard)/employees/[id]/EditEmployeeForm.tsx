'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateEmployee } from '../actions'
import type { Employee } from '@/lib/types'
import type { DepartmentOption } from '../new/NewEmployeeForm'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'
import { Field, Input, Select } from '@/components/ui/Field'
import { POSITIONS } from '@/lib/validation/employee'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'

export function EditEmployeeForm({
  employee,
  departments,
}: {
  employee: Employee
  departments: DepartmentOption[]
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
      contract_review_date: String(formData.get('contract_review_date') ?? ''),
      contract_announce_date: String(formData.get('contract_announce_date') ?? ''),
      salary_review_date: String(formData.get('salary_review_date') ?? ''),
      salary_announce_date: String(formData.get('salary_announce_date') ?? ''),
    }

    const result = await updateEmployee(employee.id, input)
    if (result.error) {
      setError(result.error)
      return
    }
    router.push(`/employees/${employee.id}`)
  }

  return (
    <form action={handleSubmit} className="max-w-3xl">
      <PageHeader title="사원 정보 수정" description={`${employee.name} · ${employee.employee_number}`} />

      <div className="flex flex-col gap-4">
        {error && <Alert variant="error">{error}</Alert>}

        <Card>
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
          </CardHeader>
          <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="사번" htmlFor="employee_number">
              <Input id="employee_number" name="employee_number" defaultValue={employee.employee_number} required />
            </Field>
            <Field label="이름" htmlFor="name">
              <Input id="name" name="name" defaultValue={employee.name} required />
            </Field>
            <Field label="생년월일" htmlFor="birth_date">
              <Input id="birth_date" type="date" name="birth_date" defaultValue={employee.birth_date ?? ''} />
            </Field>
            <Field label="연락처" htmlFor="phone">
              <Input id="phone" name="phone" defaultValue={employee.phone ?? ''} />
            </Field>
            <Field label="비상연락망" htmlFor="emergency_contact" className="sm:col-span-2">
              <Input
                id="emergency_contact"
                name="emergency_contact"
                defaultValue={employee.emergency_contact ?? ''}
              />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>근로 정보</CardTitle>
          </CardHeader>
          <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="부서" htmlFor="department_id">
              <Select id="department_id" name="department_id" defaultValue={employee.department_id ?? ''}>
                <option value="">부서 미지정</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="직급" htmlFor="position">
              <Select id="position" name="position" defaultValue={employee.position ?? ''}>
                <option value="">선택 안 함</option>
                {/* 대장에서 넘어온 값이 목록에 없을 수 있다. 그대로 남겨 두지
                    않으면 다른 항목을 고르지 않았는데도 저장 때 바뀐다. */}
                {(POSITIONS.includes(employee.position as (typeof POSITIONS)[number])
                  ? POSITIONS
                  : [...POSITIONS, employee.position].filter(Boolean)
                ).map((p) => (
                  <option key={p as string} value={p as string}>
                    {p as string}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="근로형태" htmlFor="employment_type">
              <Select id="employment_type" name="employment_type" defaultValue={employee.employment_type} required>
                <option value="정규직">정규직</option>
                <option value="계약직">계약직</option>
                <option value="인턴">인턴</option>
                <option value="프리랜서">프리랜서</option>
              </Select>
            </Field>
            <Field label="입사일" htmlFor="hire_date">
              <Input id="hire_date" type="date" name="hire_date" defaultValue={employee.hire_date} required />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>일정</CardTitle>
          </CardHeader>
          <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="정규직전환 평가일"
              htmlFor="contract_review_date"
              hint="입사일 기준으로 자동 계산됩니다. 필요시 수정하세요."
              className="sm:col-span-2"
            >
              <Input
                id="contract_review_date"
                type="date"
                name="contract_review_date"
                defaultValue={employee.contract_review_date ?? ''}
              />
            </Field>
            <Field label="정규직전환 발표일" htmlFor="contract_announce_date">
              <Input
                id="contract_announce_date"
                type="date"
                name="contract_announce_date"
                defaultValue={employee.contract_announce_date ?? ''}
              />
            </Field>
            <Field label="연봉협상 평가일" htmlFor="salary_review_date">
              <Input
                id="salary_review_date"
                type="date"
                name="salary_review_date"
                defaultValue={employee.salary_review_date ?? ''}
              />
            </Field>
            <Field label="연봉협상 발표일" htmlFor="salary_announce_date">
              <Input
                id="salary_announce_date"
                type="date"
                name="salary_announce_date"
                defaultValue={employee.salary_announce_date ?? ''}
              />
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
