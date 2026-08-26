'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateEmployee } from '../actions'
import type { Employee } from '@/lib/types'
import type { DepartmentOption } from '../new/NewEmployeeForm'

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
    <form action={handleSubmit} className="max-w-lg space-y-3">
      <h1 className="text-xl font-bold">사원 정보 수정</h1>
      {error && <p className="text-red-600">{error}</p>}
      <input name="employee_number" defaultValue={employee.employee_number} placeholder="사번" className="w-full border p-2" required />
      <input name="name" defaultValue={employee.name} placeholder="이름" className="w-full border p-2" required />
      <select name="department_id" className="w-full border p-2" defaultValue={employee.department_id ?? ''}>
        <option value="">부서 미지정</option>
        {departments.map((dept) => (
          <option key={dept.id} value={dept.id}>
            {dept.name}
          </option>
        ))}
      </select>
      <input name="position" defaultValue={employee.position ?? ''} placeholder="직급" className="w-full border p-2" />
      <select name="employment_type" defaultValue={employee.employment_type} className="w-full border p-2" required>
        <option value="정규직">정규직</option>
        <option value="계약직">계약직</option>
        <option value="인턴">인턴</option>
        <option value="프리랜서">프리랜서</option>
      </select>
      <label className="block text-sm">입사일<input type="date" name="hire_date" defaultValue={employee.hire_date} className="w-full border p-2" required /></label>
      <label className="block text-sm">생년월일<input type="date" name="birth_date" defaultValue={employee.birth_date ?? ''} className="w-full border p-2" /></label>
      <input name="phone" defaultValue={employee.phone ?? ''} placeholder="연락처" className="w-full border p-2" />
      <input name="emergency_contact" defaultValue={employee.emergency_contact ?? ''} placeholder="비상연락망" className="w-full border p-2" />
      <label className="block text-sm">정규직전환 평가일 (자동계산됨, 필요시 수정)<input type="date" name="contract_review_date" defaultValue={employee.contract_review_date ?? ''} className="w-full border p-2" /></label>
      <label className="block text-sm">정규직전환 발표일<input type="date" name="contract_announce_date" defaultValue={employee.contract_announce_date ?? ''} className="w-full border p-2" /></label>
      <label className="block text-sm">연봉협상 평가일<input type="date" name="salary_review_date" defaultValue={employee.salary_review_date ?? ''} className="w-full border p-2" /></label>
      <label className="block text-sm">연봉협상 발표일<input type="date" name="salary_announce_date" defaultValue={employee.salary_announce_date ?? ''} className="w-full border p-2" /></label>
      <button type="submit" className="rounded bg-black px-4 py-2 text-white">저장</button>
    </form>
  )
}
