/**
 * 서버가 UTC로 도는데 쓰는 사람은 한국에 있다. new Date()의 날짜를 그대로 쓰면
 * 한국 시간 오전 9시 이전에는 '어제'가 오늘이 되어, 오늘 일정이 하루 늦게
 * 종에 걸리고 캘린더의 '오늘' 표시가 어제 칸에 붙는다. en-CA 로캘의 출력이
 * YYYY-MM-DD다.
 *
 * `now`는 테스트에서 시각을 고정하기 위한 것이다. 호출부는 넘기지 않는다.
 */
export function todayInSeoul(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(now)
}
