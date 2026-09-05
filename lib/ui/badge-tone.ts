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

/**
 * 부서 배지의 색상각. 부서 목록에서의 순번을 받는다.
 *
 * 황금각(137.5°)씩 돌린다. 360/n으로 균등 분할하면 부서가 늘어날 때마다 모든
 * 부서의 색이 한꺼번에 바뀌지만, 황금각은 앞 순번의 색을 그대로 두고 남은
 * 틈에 새 색을 끼워 넣는다 — 부서를 하나 추가했다고 어제 보던 색이 전부
 * 달라지지 않는다. 순번이 이웃해도 137도씩 떨어지므로 목록에서 나란히 놓인
 * 부서끼리 특히 잘 구별된다.
 *
 * 순번은 부서 이름 정렬 순이다. id로 잡으면 uuid라 순서가 무의미하고, 이름이
 * 바뀌면 색도 바뀌지만 그건 사실상 다른 부서가 된 경우다.
 */
export function hueForDepartmentIndex(index: number): number {
  return Math.round((index * 137.508) % 360)
}


export function toneForStatus(status: string | null | undefined): BadgeTone {
  if (!status) return 'neutral'
  return TONE_BY_STATUS[status] ?? 'neutral'
}
