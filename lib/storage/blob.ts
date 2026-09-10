import { put, del, get } from '@vercel/blob'

/**
 * 증빙과 급여대장 파일 저장.
 *
 * access는 항상 'private'다. 여기에는 급여대장과 회사 재무 자료가 들어가고,
 * public이면 URL을 아는 사람은 인증 없이 내려받는다. @vercel/blob에서 access는
 * 필수 인자라 빠뜨릴 수 없지만, 값을 이 파일 밖에서 정하지 못하게 막아 두는 편이
 * 낫다 — 호출부가 실수로 'public'을 넘길 여지 자체를 없앤다.
 *
 * Supabase 시절의 버킷 두 개는 경로 접두사로 대체했다.
 */
const PREFIX = {
  document: 'documents',
  payroll: 'payroll',
  extraWork: 'extra-work',
} as const

export type BlobKind = keyof typeof PREFIX

export interface StoredFile {
  /** DB의 file_path에 저장할 값. 나중에 삭제·조회할 때 쓴다. */
  pathname: string
  url: string
}

export async function storeFile(
  kind: BlobKind,
  pathname: string,
  body: ArrayBuffer | Buffer,
  contentType?: string
): Promise<StoredFile> {
  const result = await put(`${PREFIX[kind]}/${pathname}`, body as Buffer, {
    access: 'private',
    contentType,
    // 같은 경로로 다시 올릴 때 조용히 덮어쓰지 않도록 무작위 접미사를 붙인다.
    addRandomSuffix: true,
  })

  return { pathname: result.pathname, url: result.url }
}

export async function deleteFile(pathname: string): Promise<void> {
  await del(pathname)
}

export interface ReadFileResult {
  stream: ReadableStream<Uint8Array>
  contentType: string
  size: number
}

/**
 * 비공개 파일을 읽는다. URL을 아는 것만으로는 열리지 않으므로, 세션을 확인한
 * 라우트 핸들러가 이걸로 읽어서 흘려보내는 것이 파일을 내려받는 유일한 길이다.
 * 없으면 null — 호출부가 404로 바꾼다.
 */
export async function readFile(pathname: string): Promise<ReadFileResult | null> {
  const result = await get(pathname, { access: 'private' })
  if (!result || result.statusCode !== 200) return null
  return { stream: result.stream, contentType: result.blob.contentType, size: result.blob.size }
}
