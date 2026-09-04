import { createHmac, timingSafeEqual } from 'node:crypto'

export const SESSION_COOKIE = 'op_erp_session'
export const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

/**
 * 이 앱의 인증은 공용 비밀번호 하나다. 사용자가 한 명이라는 전제 위에 서 있고,
 * 세션에 담을 신원이 없다 — 쿠키의 존재 자체가 "비밀번호를 알고 있다"는 유일한
 * 사실이다. 두 번째 사용자가 생기면 이 전제가 깨지므로 계정별 비밀번호로
 * 돌아와야 한다.
 *
 * 쿠키 값은 `<만료시각ms>.<HMAC>` 이고, 서명이 만료 시각까지 덮는다. 만료를
 * 서명 밖에 두면 쿠키를 가진 사람이 앞부분 숫자만 늘려 무기한 세션을 만들 수
 * 있다.
 */
function sign(secret: string, expiresAt: number): string {
  return createHmac('sha256', secret).update(String(expiresAt)).digest('hex')
}

export function signSession(secret: string, now: number = Date.now()): string {
  const expiresAt = now + SESSION_MAX_AGE_MS
  return `${expiresAt}.${sign(secret, expiresAt)}`
}

export function verifySession(
  value: string | undefined | null,
  secret: string,
  now: number = Date.now()
): boolean {
  if (!value) return false

  const parts = value.split('.')
  if (parts.length !== 2) return false

  const [expiryPart, signature] = parts
  if (!expiryPart || !signature) return false

  const expiresAt = Number(expiryPart)
  if (!Number.isFinite(expiresAt)) return false
  if (now >= expiresAt) return false

  const expected = sign(secret, expiresAt)

  // 길이가 다르면 timingSafeEqual이 던진다. 위조된 쿠키가 500을 내지 않도록
  // 먼저 거른다.
  if (signature.length !== expected.length) return false

  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}

/**
 * 비밀번호를 해시하지 않는 것은 의도된 선택이다. 짧은 공용 비밀번호는 해시해도
 * 즉시 역산되므로 해싱이 안전을 더하지 않는다. 실질적인 방어선은 비밀번호가
 * 저장소가 아니라 환경변수에 있다는 점이다.
 *
 * 비교는 timing-safe로 한다 — 얻는 것이 크지는 않지만 비용이 없다.
 */
export function passwordMatches(configured: string | undefined, supplied: string): boolean {
  if (!configured) return false
  if (configured.length !== supplied.length) return false
  return timingSafeEqual(Buffer.from(configured), Buffer.from(supplied))
}
