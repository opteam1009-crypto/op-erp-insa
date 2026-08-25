import { describe, it, expect } from 'vitest'
import { getThisWeekBirthdays, buildBirthdayMessage } from './birthday-reminders'

describe('getThisWeekBirthdays', () => {
  const employees = [
    { id: '1', name: '홍길동', birth_date: '1990-08-26' }, // Wed this week
    { id: '2', name: '김철수', birth_date: '1985-01-01' }, // not this week
    { id: '3', name: '이영희', birth_date: '1992-08-31' }, // Monday next week (out of range)
  ]

  it('returns employees whose birthday falls within the current Mon-Sun week', () => {
    const monday = new Date('2026-08-24') // Monday
    const result = getThisWeekBirthdays(employees, monday)
    expect(result.map((e) => e.name)).toEqual(['홍길동'])
  })

  it('returns an empty array when nobody has a birthday this week', () => {
    const monday = new Date('2026-01-05')
    const result = getThisWeekBirthdays(employees, monday)
    expect(result).toEqual([])
  })

  it('includes early-January birthdays when the week crosses a year boundary', () => {
    // Mon Dec 28 2026 - Sun Jan 3 2027. An employee born Jan 2 must be matched
    // against Jan 2 2027 (the actual date in this window), not Jan 2 2026.
    const monday = new Date('2026-12-28')
    const yearBoundaryEmployees = [{ id: '4', name: '박민수', birth_date: '1990-01-02' }]
    const result = getThisWeekBirthdays(yearBoundaryEmployees, monday)
    expect(result.map((e) => e.name)).toEqual(['박민수'])
  })
})

describe('buildBirthdayMessage', () => {
  it('lists all names in one message', () => {
    expect(buildBirthdayMessage(['홍길동', '김철수'])).toBe(
      '🎂 이번 주 생일자: 홍길동, 김철수'
    )
  })
})
