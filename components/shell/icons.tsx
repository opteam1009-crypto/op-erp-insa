import type { NavIconName } from '@/lib/nav/items'

export type IconName = NavIconName | 'menu' | 'close' | 'sun' | 'moon' | 'logout'

const PATHS: Record<IconName, React.ReactNode> = {
  users: (
    <>
      <path d="M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19" />
      <circle cx="10" cy="8" r="3.2" />
      <path d="M20 19v-1.4a3.5 3.5 0 0 0-2.6-3.4M15.6 5.2a3.2 3.2 0 0 1 0 5.6" />
    </>
  ),
  wallet: (
    <>
      <path d="M3 8.5A2.5 2.5 0 0 1 5.5 6H18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5.5A2.5 2.5 0 0 1 3 16.5z" />
      <path d="M3 8.5V7a2 2 0 0 1 2-2h10" />
      <circle cx="16.5" cy="12.5" r="1.1" />
    </>
  ),
  store: (
    <>
      <path d="M4 9.5V19a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9.5" />
      <path d="M3.2 9.5 5 5h14l1.8 4.5a2.6 2.6 0 0 1-4.6 2 2.6 2.6 0 0 1-4.2 0 2.6 2.6 0 0 1-4.2 0 2.6 2.6 0 0 1-4.6-2Z" />
      <path d="M9.5 20v-5h5v5" />
    </>
  ),
  chart: (
    <>
      <path d="M4 4v15a1 1 0 0 0 1 1h15" />
      <path d="M8 15.5v-3M12 15.5v-7M16 15.5v-5" strokeLinecap="round" />
    </>
  ),
  file: (
    <>
      <path d="M14 3.5H7.5a1.5 1.5 0 0 0-1.5 1.5v14a1.5 1.5 0 0 0 1.5 1.5h9a1.5 1.5 0 0 0 1.5-1.5V7.5z" />
      <path d="M14 3.5v4h4" />
      <path d="M9.5 13h5M9.5 16.5h3" strokeLinecap="round" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />,
  close: <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" strokeLinecap="round" />
    </>
  ),
  moon: <path d="M20 14.2A8.2 8.2 0 0 1 9.8 4a8.2 8.2 0 1 0 10.2 10.2Z" />,
  logout: (
    <>
      <path d="M9 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h3" />
      <path d="M15.5 15.5 19 12l-3.5-3.5M19 12H9.5" strokeLinecap="round" />
    </>
  ),
}

export function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
      aria-hidden
      className="shrink-0"
    >
      {PATHS[name]}
    </svg>
  )
}
