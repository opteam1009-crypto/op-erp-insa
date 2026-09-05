export type BadgeTone =
  | 'positive'
  | 'warning'
  | 'negative'
  | 'accent'
  | 'neutral'
  // 아래 여덟은 부서처럼 '좋다/나쁘다'가 없는, 서로 구별만 되면 되는 값들을
  // 위한 색이다. 의미를 담지 않으므로 상태 배지에는 쓰지 않는다.
  | 'violet'
  | 'sky'
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'teal'
  | 'orange'
  | 'cyan'

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
  // 근로형태. 재직상태(재직 초록 / 퇴사 빨강)와 나란히 놓이는 열이라 그쪽과
  // 겹치지 않는 색을 쓴다 — 둘 다 초록이면 어느 쪽을 보고 있는지 흐려진다.
  정규직: 'sky',
  계약직: 'orange',
  인턴: 'violet',
  프리랜서: 'neutral',
}

/** 부서 색은 이름으로 정해진다. 부서가 늘어도 손댈 곳이 없고, 같은 부서는 늘
 *  같은 색이라 목록을 훑을 때 위치가 아니라 색으로 묶여 읽힌다. */
const DEPARTMENT_TONES: readonly BadgeTone[] = [
  'violet',
  'sky',
  'emerald',
  'amber',
  'rose',
  'teal',
  'orange',
  'cyan',
]

export function toneForDepartment(name: string | null | undefined): BadgeTone {
  if (!name) return 'neutral'
  let hash = 0
  for (const char of name) hash = (hash * 31 + (char.codePointAt(0) ?? 0)) >>> 0
  return DEPARTMENT_TONES[hash % DEPARTMENT_TONES.length]
}

export function toneForStatus(status: string | null | undefined): BadgeTone {
  if (!status) return 'neutral'
  return TONE_BY_STATUS[status] ?? 'neutral'
}
