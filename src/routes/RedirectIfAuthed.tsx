import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

/** Usado em rotas públicas (landing, login, signup) — manda quem já está
 * logado direto para o dashboard em vez de mostrar a tela de novo. */
export function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas text-canvas-fg">
        <p className="text-label text-sm">Carregando…</p>
      </div>
    )
  }

  if (session) return <Navigate to="/dashboard" replace />

  return children
}
