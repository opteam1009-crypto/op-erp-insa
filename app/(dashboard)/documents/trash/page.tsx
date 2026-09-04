import { sql } from '@/lib/db/sql'
import { TrashList } from './TrashList'
import type { DocumentRecord } from '@/lib/types'

export default async function TrashPage() {
  // 예전에는 클라이언트가 직접 Supabase로 조회했다. Neon에는 브라우저에서 붙을
  // 방법이 없으므로 여기서 읽어 props로 내린다.
  const documents = (await sql`
    select * from documents where deleted_at is not null order by deleted_at desc
  `) as DocumentRecord[]

  return <TrashList documents={documents} />
}
