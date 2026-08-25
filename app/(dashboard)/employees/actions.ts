'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabase } from '@/lib/supabase/server'
import { employeeSchema, type EmployeeInput } from '@/lib/validation/employee'

export async function createEmployee(input: EmployeeInput) {
  const parsed = employeeSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(', ') }
  }

  const supabase = await createServerSupabase()
  const { data: auth } = await supabase.auth.getUser()

  const { error } = await supabase.from('employees').insert({
    ...parsed.data,
    department_id: parsed.data.department_id || null,
    birth_date: parsed.data.birth_date || null,
    contract_review_date: parsed.data.contract_review_date || null,
    contract_announce_date: parsed.data.contract_announce_date || null,
    created_by: auth.user?.id,
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
