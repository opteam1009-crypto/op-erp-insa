import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_KR } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// preload: false — Noto Sans KR은 한글이 subsets 옵션으로 켜고 끄는 대상이 아니라
// 기본으로 포함되는 핵심 글리프 세트다 (subsets: ["latin"]만 넣어도 한글이 포함된다).
// 그 한글 글리프가 unicode-range 청크 수백 개로 쪼개져 나오므로, 전부 preload하면
// 초기 로드가 수 MB로 불어난다. 브라우저가 실제로 필요한 청크만 받게 둔다.
const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-kr",
  subsets: ["latin"],
  preload: false,
});

// 페인트 전에 테마를 확정해 라이트/다크 깜빡임을 막는다.
const THEME_INIT = `(function(){try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='light';}})();`;

export const metadata: Metadata = {
  title: "회사 ERP",
  description: "사원정보·증빙·급여대장을 관리하는 사내 ERP 시스템",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${notoSansKr.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body className="min-h-full flex flex-col bg-bg text-fg">{children}</body>
    </html>
  );
}
