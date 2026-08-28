import type { Session, User } from '@supabase/supabase-js'
import { createContext, type ReactNode, use, useEffect, useState } from 'react'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'

interface AuthContextValue {
  session: Session | null
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

// Login de teste usado só enquanto o Supabase não está configurado (ver
// .env.example / SUPABASE_SETUP.md) — deixa navegar o app sem precisar de
// um backend real. Some sozinho assim que VITE_SUPABASE_URL/ANON_KEY forem
// preenchidos: isSupabaseConfigured vira true e signIn passa a exigir a
// conta real do Supabase.
const MOCK_ADMIN_USERNAME = 'admin'
const MOCK_ADMIN_EMAIL = 'admin@test.local'
const MOCK_ADMIN_PASSWORD = '12345'
const MOCK_SESSION_STORAGE_KEY = 'gdscribe.mockSession'

function buildMockSession(): Session {
  const nowSeconds = Math.floor(Date.now() / 1000)
  const user: User = {
    id: 'mock-admin',
    aud: 'authenticated',
    role: 'authenticated',
    email: MOCK_ADMIN_EMAIL,
    created_at: new Date().toISOString(),
    app_metadata: { provider: 'mock' },
    user_metadata: { name: 'Admin (teste)' },
  }
  return {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    token_type: 'bearer',
    expires_in: 60 * 60 * 24,
    expires_at: nowSeconds + 60 * 60 * 24,
    user,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      if (localStorage.getItem(MOCK_SESSION_STORAGE_KEY)) {
        setSession(buildMockSession())
      }
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => subscription.subscription.unsubscribe()
  }, [])

  async function signIn(email: string, password: string) {
    if (!isSupabaseConfigured) {
      const normalized = email.trim().toLowerCase()
      const isAdmin =
        (normalized === MOCK_ADMIN_USERNAME || normalized === MOCK_ADMIN_EMAIL) &&
        password === MOCK_ADMIN_PASSWORD
      if (!isAdmin) {
        return { error: 'Supabase não configurado — use o login de teste: admin / 12345.' }
      }
      localStorage.setItem(MOCK_SESSION_STORAGE_KEY, '1')
      setSession(buildMockSession())
      return { error: null }
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  async function signUp(email: string, password: string) {
    if (!isSupabaseConfigured) {
      return {
        error: 'Supabase não configurado — cadastro real indisponível. Use o login de teste: admin / 12345.',
      }
    }
    const { error } = await supabase.auth.signUp({ email, password })
    return { error: error?.message ?? null }
  }

  async function signOut() {
    if (!isSupabaseConfigured) {
      localStorage.removeItem(MOCK_SESSION_STORAGE_KEY)
      setSession(null)
      return
    }
    await supabase.auth.signOut()
  }

  return (
    <AuthContext
      value={{ session, user: session?.user ?? null, loading, signIn, signUp, signOut }}
    >
      {children}
    </AuthContext>
  )
}

export function useAuth() {
  const ctx = use(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
