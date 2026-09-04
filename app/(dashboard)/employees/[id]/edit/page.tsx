import { notFound } from 'next/navigation'
import { sql } from '@/lib/db/sql'
import { EditEmployeeForm } from '../EditEmployeeForm'
import type { DepartmentOption } from '../../new/NewEmployeeForm'
import type { Employee } from '@/lib/types'

export default async function EditEmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [employees, departments] = await Promise.all([
    sql`select * from employees where id = ${id}`,
    sql`select id, name from departments order by name`,
  ])

  const employee = (employees as Employee[])[0]
  if (!employee) notFound()

  return <EditEmployeeForm employee={employee} departments={departments as DepartmentOption[]} />
}
