'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { sql } from '@/lib/db/sql'
import { isSignedIn } from '@/lib/auth/current-user'
import { deleteFile } from '@/lib/storage/blob'
import { EXTRA_WORK_KIND_INFO, EXTRA_WORK_KINDS } from '@/lib/extra-work/extra-work'
import {
  addTargetsSchema,
  hoursInputSchema,
  noteInputSchema,
  type AddTargetsInput,
} from '@/lib/validation/extra-work'

interface ActionResult {
  error: string | null
}

const idSchema = z.uuid()

function issues(error: z.ZodError): string {
  return error.issues.map((i) => i.message).join(', ')
}

/** 두 화면이 한 표를 보므로 둘 다 다시 그린다. 어느 쪽에서 고쳤는지 따지지 않는다. */
function revalidateExtraWork() {
  for (const kind of EXTRA_WORK_KINDS) revalidatePath(EXTRA_WORK_KIND_INFO[kind].href)
}

/**
 * 이달 대상자를 올린다. 서버 액션은 직접 호출 가능한 엔드포인트라 proxy.ts를
 * 우회하므로 세션 검사가 여기에도 있어야 한다.
 */
export async function addExtraWorkTargets(
  input: AddTargetsInput
): Promise<ActionResult & { added: number }> {
  if (!(await isSignedIn())) return { error: '로그인이 필요합니다', added: 0 }

  const parsed = addTargetsSchema.safeParse(input)
  if (!parsed.success) return { error: issues(parsed.error), added: 0 }
  const { kind, period, employeeIds } = parsed.data

  try {
    // id 목록은 JSON 문자열 하나로 넘기고 DB에서 펼친다. 드라이버가 JS 배열을
    // 어떻게 직렬화하는지에 기대지 않으려는 것이다.
    // 이미 올라간 사람은 unique 제약에 걸려 조용히 건너뛴다 — 두 번 눌러도 한 건이다.
    const rows = (await sql`
      insert into extra_work (employee_id, kind, period)
      select e.id, ${kind}, ${period}
      from employees e
      where e.id in (
        select value::uuid from jsonb_array_elements_text(${JSON.stringify(employeeIds)}::jsonb)
      )
      on conflict (employee_id, kind, period) do nothing
      returning id
    `) as { id: string }[]
    revalidateExtraWork()
    return { error: null, added: rows.length }
  } catch (error) {
    return { error: error instanceof Error ? error.message : '저장에 실패했습니다', added: 0 }
  }
}

/**
 * 목록에서 한 칸만 고친다. 사원 목록의 updateEmployeeField와 같은 구조다 —
 * 고칠 수 있는 열을 아래 분기로 못박아, 클라이언트가 열 이름을 고를 수 없게 한다.
 */
const INLINE_SCHEMAS = {
  hours: hoursInputSchema,
  note: noteInputSchema,
} as const

export type ExtraWorkInlineField = keyof typeof INLINE_SCHEMAS

export async function updateExtraWorkField(
  id: string,
  field: ExtraWorkInlineField,
  raw: string
): Promise<ActionResult> {
  if (!(await isSignedIn())) return { error: '로그인이 필요합니다' }
  if (!idSchema.safeParse(id).success) return { error: '잘못된 요청입니다' }

  const schema = INLINE_SCHEMAS[field]
  if (!schema) return { error: '수정할 수 없는 항목입니다' }

  const parsed = schema.safeParse(raw)
  if (!parsed.success) return { error: issues(parsed.error) }
  const value = parsed.data

  try {
    switch (field) {
      case 'hours':
        await sql`
          update extra_work
             set hours = ${value === '' ? null : Number(value)}, updated_at = now()
           where id = ${id}
        `
        break
      case 'note':
        await sql`
          update extra_work set note = ${value || null}, updated_at = now() where id = ${id}
        `
        break
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : '저장에 실패했습니다' }
  }

  revalidateExtraWork()
  return { error: null }
}

/**
 * 서류를 받았다는 표시. 파일 없이 종이로 받았을 때 쓴다. 파일을 올리면 라우트가
 * 알아서 찍으므로 그 경우에는 누를 일이 없다. 되돌리면 파일은 그대로 두고 표시만
 * 지운다 — 표시 하나 잘못 눌렀다고 서류가 사라지면 안 된다.
 */
export async function setExtraWorkSubmitted(id: string, submitted: boolean): Promise<ActionResult> {
  if (!(await isSignedIn())) return { error: '로그인이 필요합니다' }
  if (!idSchema.safeParse(id).success) return { error: '잘못된 요청입니다' }

  try {
    await sql`
      update extra_work
         set submitted_at = case when ${submitted}::boolean then now() else null end,
             updated_at = now()
       where id = ${id}
    `
  } catch (error) {
    return { error: error instanceof Error ? error.message : '저장에 실패했습니다' }
  }

  revalidateExtraWork()
  return { error: null }
}

/** 잘못 올린 대상자를 지운다. 받아 둔 서류 파일도 함께 지운다. */
export async function deleteExtraWork(id: string): Promise<ActionResult> {
  if (!(await isSignedIn())) return { error: '로그인이 필요합니다' }
  if (!idSchema.safeParse(id).success) return { error: '잘못된 요청입니다' }

  let filePath: string | null = null
  try {
    const rows = (await sql`
      delete from extra_work where id = ${id} returning file_path
    `) as { file_path: string | null }[]
    filePath = rows[0]?.file_path ?? null
  } catch (error) {
    return { error: error instanceof Error ? error.message : '삭제에 실패했습니다' }
  }

  if (filePath) {
    try {
      await deleteFile(filePath)
    } catch (error) {
      // 행은 이미 지워졌다. 파일이 남는 건 저장 공간 문제일 뿐 화면에는 영향이
      // 없으므로, 여기서 실패를 사용자에게 돌리지 않는다.
      console.error('Failed to delete extra-work file:', error)
    }
  }

  revalidateExtraWork()
  return { error: null }
}
