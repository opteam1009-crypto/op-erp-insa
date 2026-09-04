import { LoginForm } from './LoginForm'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface px-7 py-8">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span
            aria-hidden
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-[15px] font-bold text-accent-fg"
          >
            E
          </span>
          <div>
            <h1 className="text-[20px] font-semibold text-fg">회사 ERP</h1>
            <p className="mt-1 text-[13.5px] text-fg-muted">
              사원정보 · 증빙 · 급여대장을 관리합니다
            </p>
          </div>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
