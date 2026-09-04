'use server'

import { revalidatePath } from 'next/cache'
import { sql } from '@/lib/db/sql'
import { franchiseStoreSchema, type FranchiseStoreInput } from '@/lib/validation/franchise-store'
import { isSignedIn } from '@/lib/auth/current-user'

export async function createFranchiseStore(input: FranchiseStoreInput) {
  // 서버 액션은 직접 호출 가능한 엔드포인트라 proxy.ts를 우회한다.
  if (!(await isSignedIn())) return { error: '로그인이 필요합니다' }

  const parsed = franchiseStoreSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(', ') }
  }

  try {
    await sql`insert into franchise_stores (name) values (${parsed.data.name})`
  } catch (error) {
    return { error: error instanceof Error ? error.message : '저장에 실패했습니다' }
  }

  revalidatePath('/franchise-stores')
  return { error: null }
}

export async function toggleFranchiseStoreStatus(id: string, currentStatus: '운영중' | '폐업') {
  if (!(await isSignedIn())) return { error: '로그인이 필요합니다' }

  const nextStatus = currentStatus === '운영중' ? '폐업' : '운영중'

  try {
    await sql`update franchise_stores set status = ${nextStatus} where id = ${id}`
  } catch (error) {
    return { error: error instanceof Error ? error.message : '변경에 실패했습니다' }
  }

  revalidatePath('/franchise-stores')
  return { error: null }
}
