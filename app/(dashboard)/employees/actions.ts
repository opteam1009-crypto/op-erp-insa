'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabase } from '@/lib/supabase/server'
import { employeeSchema, type EmployeeInput } from '@/lib/validation/employee'
import { getCurrentUser } from '@/lib/auth/current-user'
import { permissions } from '@/lib/auth/permissions'

export async function createEmployee(input: EmployeeInput) {
  // A server action is a directly-callable endpoint, so it needs the same
  // session + role gate as the page that renders the form.
  const user = await getCurrentUser()
  if (!user) return { error: '로그인이 필요합니다' }
  if (!permissions.canManageEmployees(user.role)) {
    return { error: '권한이 없습니다' }
  }

  const parsed = employeeSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(', ') }
  }

  const supabase = await createServerSupabase()

  const { error } = await supabase.from('employees').insert({
    ...parsed.data,
    department_id: parsed.data.department_id || null,
    birth_date: parsed.data.birth_date || null,
    contract_review_date: parsed.data.contract_review_date || null,
    contract_announce_date: parsed.data.contract_announce_date || null,
    created_by: user.userId,
  })

  if (error) return { error: error.message }

  revalidatePath('/employees')
  return { error: null }
}

export async function updateEmployee(id: string, input: EmployeeInput) {
  const parsed = employeeSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(', ') }
  }

  const supabase = await createServerSupabase()

  const { error } = await supabase
    .from('employees')
    .update({
      ...parsed.data,
      department_id: parsed.data.department_id || null,
      birth_date: parsed.data.birth_date || null,
      contract_review_date: parsed.data.contract_review_date || null,
      contract_announce_date: parsed.data.contract_announce_date || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/employees')
  revalidatePath(`/employees/${id}`)
  return { error: null }
}
