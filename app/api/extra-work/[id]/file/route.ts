import { NextResponse, type NextRequest } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { sql } from '@/lib/db/sql'
import { isSignedIn } from '@/lib/auth/current-user'
import { deleteFile, readFile, storeFile } from '@/lib/storage/blob'
import { MAX_FILE_SIZE_BYTES } from '@/lib/validation/upload'
import { hasAllowedExtraWorkExtension } from '@/lib/validation/extra-work'
import { contentDisposition } from '@/lib/http/content-disposition'
import { EXTRA_WORK_KIND_INFO, type ExtraWorkKind } from '@/lib/extra-work/extra-work'

interface FileRow {
  id: string
  kind: ExtraWorkKind
  period: string
  employee_id: string
  file_path: string | null
  file_name: string | null
}

type Params = { params: Promise<{ id: string }> }

async function loadRow(id: string): Promise<FileRow | null> {
  if (!z.uuid().safeParse(id).success) return null
  const rows = (await sql`
    select id, kind, period, employee_id, file_path, file_name from extra_work where id = ${id}
  `) as FileRow[]
  return rows[0] ?? null
}

/**
 * 제출 서류를 올린다. 올리는 순간 '받았다'는 표시도 함께 찍는다 — 파일이 있는데
 * 미제출인 상태는 만들지 않는다. 이미 찍혀 있으면 처음 받은 시각을 남긴다.
 */
export async function POST(request: NextRequest, { params }: Params) {
  if (!(await isSignedIn())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await params
  const row = await loadRow(id)
  if (!row) return NextResponse.json({ error: '대상을 찾을 수 없습니다' }, { status: 404 })

  const formData = await request.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: '파일이 없습니다' }, { status: 400 })
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json({ error: '파일이 20MB를 초과합니다' }, { status: 400 })
  }
  if (!hasAllowedExtraWorkExtension(file.name)) {
    return NextResponse.json({ error: '허용되지 않는 파일 형식입니다' }, { status: 400 })
  }

  const buffer = await file.arrayBuffer()
  const slug = EXTRA_WORK_KIND_INFO[row.kind].slug

  let stored
  try {
    // hwp처럼 브라우저가 MIME을 모르는 파일은 type이 빈 문자열로 온다.
    stored = await storeFile(
      'extraWork',
      `${slug}/${row.period}/${row.employee_id}/${file.name}`,
      buffer,
      file.type || 'application/octet-stream'
    )
  } catch (error) {
    console.error('Failed to store extra-work file:', error)
    return NextResponse.json({ error: '파일 저장에 실패했습니다' }, { status: 500 })
  }

  try {
    await sql`
      update extra_work
         set file_path = ${stored.pathname},
             file_name = ${file.name},
             submitted_at = coalesce(submitted_at, now()),
             updated_at = now()
       where id = ${row.id}
    `
  } catch (error) {
    console.error('Failed to record extra-work file:', error)
    return NextResponse.json({ error: '저장에 실패했습니다' }, { status: 500 })
  }

  // 교체된 옛 파일은 행이 새 파일을 가리킨 뒤에 지운다. 여기서 실패해도 화면은
  // 이미 맞으므로 기록만 남긴다.
  if (row.file_path && row.file_path !== stored.pathname) {
    try {
      await deleteFile(row.file_path)
    } catch (error) {
      console.error('Failed to delete replaced extra-work file:', error)
    }
  }

  revalidatePath(EXTRA_WORK_KIND_INFO[row.kind].href)
  return NextResponse.json({ ok: true })
}

/**
 * 받아 둔 서류를 내려준다. Blob은 비공개라 URL만으로는 열리지 않고, 이 핸들러가
 * 세션을 확인한 뒤 읽어서 흘려보내는 것이 유일한 길이다.
 */
export async function GET(_request: NextRequest, { params }: Params) {
  if (!(await isSignedIn())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await params
  const row = await loadRow(id)
  if (!row?.file_path) return NextResponse.json({ error: '파일이 없습니다' }, { status: 404 })

  let file
  try {
    file = await readFile(row.file_path)
  } catch (error) {
    console.error('Failed to read extra-work file:', error)
    return NextResponse.json({ error: '파일을 읽지 못했습니다' }, { status: 500 })
  }
  if (!file) return NextResponse.json({ error: '파일이 없습니다' }, { status: 404 })

  const contentType = file.contentType || 'application/octet-stream'
  return new Response(file.stream, {
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(file.size),
      'Content-Disposition': contentDisposition(row.file_name ?? 'file', contentType),
      // 급여 관련 서류다. 공유 캐시에 남으면 안 된다.
      'Cache-Control': 'private, no-store',
    },
  })
}
