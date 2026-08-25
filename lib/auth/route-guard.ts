const PUBLIC_PATHS = ['/login', '/auth/callback', '/api/cron']

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname.startsWith(path))
}

const ADMIN_ONLY_PATHS = ['/admin']

export function isAdminOnlyPath(pathname: string): boolean {
  return ADMIN_ONLY_PATHS.some((path) => pathname.startsWith(path))
}
