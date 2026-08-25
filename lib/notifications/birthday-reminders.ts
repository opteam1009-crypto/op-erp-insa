import { startOfWeek, endOfWeek, isWithinInterval } from 'date-fns'

export interface BirthdayEmployee {
  id: string
  name: string
  birth_date: string
}

export function getThisWeekBirthdays(employees: BirthdayEmployee[], today: Date): BirthdayEmployee[] {
  const weekStart = startOfWeek(today, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 })

  return employees.filter((emp) => {
    if (!emp.birth_date) return false
    const [, month, day] = emp.birth_date.split('-').map(Number)
    const thisYearBirthday = new Date(today.getFullYear(), month - 1, day)
    return isWithinInterval(thisYearBirthday, { start: weekStart, end: weekEnd })
  })
}

export function buildBirthdayMessage(names: string[]): string {
  return `🎂 이번 주 생일자: ${names.join(', ')}`
}
