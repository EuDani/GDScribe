import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Field, TextInput } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Logo } from '@/components/Logo'
import { useAuth } from '@/contexts/AuthContext'
import { isSupabaseConfigured } from '@/lib/supabase'

export function AuthPage({ mode }: { mode: 'login' | 'signup' }) {
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const isLogin = mode === 'login'
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setSubmitting(true)
    const result = isLogin ? await signIn(email, password) : await signUp(email, password)
    setSubmitting(false)

    if (result.error) {
      setError(result.error)
      return
    }

    if (isLogin) {
      navigate(from, { replace: true })
    } else {
      setInfo('Conta criada! Confirme seu e-mail (se exigido) e entre.')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 text-canvas-fg">
      <div className="w-full max-w-sm">
        <Link to="/" className="text-display mb-6 flex items-center justify-center gap-2 text-lg">
          <Logo />
          GDScribe
        </Link>
        <Card>
          <h1 className="text-display mb-5 text-xl">{isLogin ? 'Entrar' : 'Criar conta'}</h1>

          {!isSupabaseConfigured && (
            <p className="mb-4 border-2 border-accent-red bg-canvas px-3 py-2 text-xs text-accent-red">
              Supabase não configurado. Veja SUPABASE_SETUP.md antes de continuar.
              {isLogin && (
                <>
                  {' '}
                  Login de teste: <strong>admin</strong> / <strong>12345</strong>.
                </>
              )}
            </p>
          )}

          <form onSubmit={handleSubmit}>
            <Field label={isSupabaseConfigured ? 'E-mail' : 'E-mail ou usuário'}>
              <TextInput
                type={isSupabaseConfigured ? 'email' : 'text'}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={isSupabaseConfigured ? 'voce@estudio.com' : 'admin'}
              />
            </Field>
            <Field label="Senha">
              <TextInput
                type="password"
                required
                minLength={isSupabaseConfigured ? 6 : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </Field>

            {error && <p className="mb-3 text-xs text-accent-red">{error}</p>}
            {info && <p className="mb-3 text-xs text-accent-green">{info}</p>}

            <Button type="submit" className="w-full justify-center" disabled={submitting}>
              {submitting ? 'Enviando…' : isLogin ? 'Entrar' : 'Criar conta'}
            </Button>
          </form>
        </Card>
        <p className="text-label mt-4 text-center text-xs text-canvas-fg/50">
          {isLogin ? (
            <>
              Não tem conta?{' '}
              <Link to="/signup" className="text-accent-yellow hover:underline">
                Criar conta
              </Link>
            </>
          ) : (
            <>
              Já tem conta?{' '}
              <Link to="/login" className="text-accent-yellow hover:underline">
                Entrar
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
