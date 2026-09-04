import { describe, it, expect } from 'vitest'
import { signSession, verifySession, SESSION_MAX_AGE_MS } from './session'

const SECRET = 'test-secret-0123456789abcdef'
const NOW = Date.parse('2026-09-04T12:00:00Z')

describe('signSession', () => {
  it('produces a value carrying its own expiry', () => {
    const value = signSession(SECRET, NOW)
    const [expiry] = value.split('.')
    expect(Number(expiry)).toBe(NOW + SESSION_MAX_AGE_MS)
  })

  it('produces a different signature for a different secret', () => {
    expect(signSession(SECRET, NOW)).not.toBe(signSession('other-secret', NOW))
  })
})

describe('verifySession', () => {
  it('accepts a value it just signed', () => {
    expect(verifySession(signSession(SECRET, NOW), SECRET, NOW)).toBe(true)
  })

  it('accepts a value up until the moment it expires', () => {
    const value = signSession(SECRET, NOW)
    expect(verifySession(value, SECRET, NOW + SESSION_MAX_AGE_MS - 1)).toBe(true)
  })

  it('rejects a value once it has expired', () => {
    const value = signSession(SECRET, NOW)
    expect(verifySession(value, SECRET, NOW + SESSION_MAX_AGE_MS + 1)).toBe(false)
  })

  it('rejects a value signed with a different secret', () => {
    const value = signSession('other-secret', NOW)
    expect(verifySession(value, SECRET, NOW)).toBe(false)
  })

  // 서명은 만료 시각까지 덮는다. 그러지 않으면 쿠키를 가진 사람이 앞부분 숫자만
  // 늘려 무기한 세션을 만들 수 있다.
  it('rejects a value whose expiry was extended by hand', () => {
    const value = signSession(SECRET, NOW)
    const [, signature] = value.split('.')
    const forged = `${NOW + SESSION_MAX_AGE_MS * 100}.${signature}`
    expect(verifySession(forged, SECRET, NOW)).toBe(false)
  })

  it('rejects a tampered signature', () => {
    const value = signSession(SECRET, NOW)
    const [expiry, signature] = value.split('.')
    const flipped = signature.startsWith('a') ? `b${signature.slice(1)}` : `a${signature.slice(1)}`
    expect(verifySession(`${expiry}.${flipped}`, SECRET, NOW)).toBe(false)
  })

  it.each([
    ['empty', ''],
    ['no separator', 'abcdef'],
    ['missing signature', `${NOW}.`],
    ['missing expiry', '.abcdef'],
    ['non-numeric expiry', 'never.abcdef'],
    ['extra segments', `${NOW}.abc.def`],
  ])('rejects a malformed value (%s)', (_label, value) => {
    expect(verifySession(value, SECRET, NOW)).toBe(false)
  })

  it('rejects when no value is present at all', () => {
    expect(verifySession(undefined, SECRET, NOW)).toBe(false)
  })

  // 서명 길이가 다르면 timingSafeEqual이 예외를 던진다. 그 예외가 500으로
  // 새어나가지 않고 그냥 거부로 처리되어야 한다.
  it('rejects a signature of the wrong length without throwing', () => {
    expect(() => verifySession(`${NOW + 1000}.short`, SECRET, NOW)).not.toThrow()
    expect(verifySession(`${NOW + 1000}.short`, SECRET, NOW)).toBe(false)
  })
})

describe('passwordMatches', () => {
  it('is exported for the login action to use', async () => {
    const { passwordMatches } = await import('./session')
    expect(passwordMatches('1234', '1234')).toBe(true)
    expect(passwordMatches('1234', '12345')).toBe(false)
    expect(passwordMatches('1234', '')).toBe(false)
  })

  it('rejects everything when no password is configured', async () => {
    const { passwordMatches } = await import('./session')
    expect(passwordMatches(undefined, '1234')).toBe(false)
    expect(passwordMatches('', '1234')).toBe(false)
    expect(passwordMatches('', '')).toBe(false)
  })
})
