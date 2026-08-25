export function isPurgeable(deletedAt: string | null, now: Date, retentionDays = 30): boolean {
  if (!deletedAt) return false
  const deletedDate = new Date(deletedAt)
  const diffDays = (now.getTime() - deletedDate.getTime()) / (1000 * 60 * 60 * 24)
  return diffDays >= retentionDays
}
