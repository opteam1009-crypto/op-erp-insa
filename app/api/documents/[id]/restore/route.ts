import { NextResponse, type NextRequest } from 'next/server'
import { sql } from '@/lib/db/sql'
import { isSignedIn } from '@/lib/auth/current-user'

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  if (!(await isSignedIn())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  try {
    await sql`update documents set deleted_at = null where id = ${id}`
  } catch (error) {
    console.error('Failed to restore document:', error)
    return NextResponse.json({ error: 'restore failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
