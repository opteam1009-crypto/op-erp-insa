export type BadgeTone = 'positive' | 'warning' | 'negative' | 'accent' | 'neutral'

/**
 * 도메인 상태 문자열 → 배지 색조.
 *
 * 키는 전부 lib/types.ts의 실제 유니온 값이거나 손익 화면이 만들어내는
 * 파생 라벨(미수금/미지급금)이다. 모르는 값은 neutral로 떨어뜨려
 * DB에 새 상태가 생겨도 화면이 깨지지 않게 한다.
 */
const TONE_BY_STATUS: Record<string, BadgeTone> = {
  재직: 'positive',
  운영중: 'positive',
  매출: 'positive',
  미수금: 'positive',
  휴직: 'warning',
  퇴사: 'negative',
  폐업: 'negative',
  미지급금: 'negative',
  매입: 'accent',
}

export function toneForStatus(status: string | null | undefined): BadgeTone {
  if (!status) return 'neutral'
  return TONE_BY_STATUS[status] ?? 'neutral'
}
