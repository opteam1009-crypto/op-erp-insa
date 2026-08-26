'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabase } from '@/lib/supabase/server'
import { franchiseStoreSchema, type FranchiseStoreInput } from '@/lib/validation/franchise-store'
import { getCurrentUser } from '@/lib/auth/current-user'
import { permissions } from '@/lib/auth/permissions'

export async function createFranchiseStore(input: FranchiseStoreInput) {
  const user = await getCurrentUser()
  if (!user) return { error: '로그인이 필요합니다' }
  if (!permissions.canManageFranchiseStores(user.role)) {
    return { error: '권한이 없습니다' }
  }

  const parsed = franchiseStoreSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(', ') }
  }

  const supabase = await createServerSupabase()
  const { error } = await supabase.from('franchise_stores').insert({
    ...parsed.data,
    created_by: user.userId,
  })

  if (error) return { error: error.message }

  revalidatePath('/franchise-stores')
  return { error: null }
}

export async function toggleFranchiseStoreStatus(id: string, currentStatus: '운영중' | '폐업') {
  const user = await getCurrentUser()
  if (!user) return { error: '로그인이 필요합니다' }
  if (!permissions.canManageFranchiseStores(user.role)) {
    return { error: '권한이 없습니다' }
  }

  const nextStatus = currentStatus === '운영중' ? '폐업' : '운영중'

  const supabase = await createServerSupabase()
  const { error } = await supabase
    .from('franchise_stores')
    .update({ status: nextStatus })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/franchise-stores')
  return { error: null }
}
