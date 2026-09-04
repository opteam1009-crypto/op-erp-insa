import { neon } from '@neondatabase/serverless'

/**
 * 이 앱의 유일한 데이터베이스 진입점.
 *
 * 태그드 템플릿으로만 쓴다 — 보간된 값은 전부 파라미터로 바인딩되므로 SQL
 * 인젝션이 구조적으로 막힌다. 문자열을 이어붙여 쿼리를 만들지 말 것.
 *
 *   const rows = await sql`select * from employees where id = ${id}`
 *
 * Supabase 시절에는 RLS가 두 번째 방어선이었다. Neon에는 앱 role 하나로 붙으므로
 * DB가 걸러 주는 것이 없다 — 인가는 proxy.ts의 세션 검사가 전담한다. 세션 검사를
 * 우회하는 경로를 만들면 그대로 열린다.
 */
function connectionString(): string {
  // Vercel의 Neon 통합은 여러 이름으로 넣어 준다. 풀링된 것을 먼저 고른다.
  const url =
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.DATABASE_URL_UNPOOLED ??
    process.env.POSTGRES_URL_NON_POOLING

  if (!url) {
    throw new Error(
      'DATABASE_URL이 없습니다. Vercel → Storage에서 Neon을 연결하거나 .env.local에 직접 넣으세요.'
    )
  }
  return url
}

/**
 * 모듈 로드 시점이 아니라 첫 호출 때 연결을 만든다. 최상위에서 만들면 환경변수가
 * 없는 빌드(프리뷰/CI)에서 import만으로 터져 `next build`가 실패한다.
 */
let client: ReturnType<typeof neon> | null = null

export const sql: ReturnType<typeof neon> = ((strings: TemplateStringsArray, ...values: unknown[]) => {
  client ??= neon(connectionString())
  return client(strings, ...values)
}) as ReturnType<typeof neon>
