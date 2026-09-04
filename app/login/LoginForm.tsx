'use client'

import { useActionState } from 'react'
import { signIn, type SignInResult } from '@/lib/auth/actions'
import { Field, Input } from '@/components/ui/Field'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'

export function LoginForm() {
  const [state, formAction, pending] = useActionState<SignInResult | null, FormData>(signIn, null)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state?.error && <Alert variant="error">{state.error}</Alert>}

      <Field label="비밀번호" htmlFor="password">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          autoFocus
          required
        />
      </Field>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? '확인 중…' : '로그인'}
      </Button>
    </form>
  )
}
