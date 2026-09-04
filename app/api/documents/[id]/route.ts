import { NextResponse, type NextRequest } from 'next/server'
import { sql } from '@/lib/db/sql'
import { isSignedIn } from '@/lib/auth/current-user'

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  if (!(await isSignedIn())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  try {
    // 소프트 삭제다. 30일간 휴지통에 남아 복원할 수 있다.
    await sql`update documents set deleted_at = now() where id = ${id}`
  } catch (error) {
    console.error('Failed to delete document:', error)
    return NextResponse.json({ error: 'delete failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
