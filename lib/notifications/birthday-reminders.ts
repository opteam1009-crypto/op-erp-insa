import { startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns'

export interface BirthdayEmployee {
  id: string
  name: string
  birth_date: string
}

export function getThisWeekBirthdays(employees: BirthdayEmployee[], today: Date): BirthdayEmployee[] {
  const weekStart = startOfWeek(today, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 })

  // Compare month/day only (not year-anchored), so a week that crosses a year
  // boundary (e.g. Mon Dec 28 - Sun Jan 3) doesn't wrongly re-anchor early-January
  // birthdays onto the wrong, already-past year and drop them out of the window.
  const monthDayKeys = new Set(
    eachDayOfInterval({ start: weekStart, end: weekEnd }).map((d) => `${d.getMonth() + 1}-${d.getDate()}`)
  )

  return employees.filter((emp) => {
    if (!emp.birth_date) return false
    const [, month, day] = emp.birth_date.split('-').map(Number)
    return monthDayKeys.has(`${month}-${day}`)
  })
}

export function buildBirthdayMessage(names: string[]): string {
  return `🎂 이번 주 생일자: ${names.join(', ')}`
}
