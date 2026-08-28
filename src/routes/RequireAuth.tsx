import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink text-paper">
        <p className="text-label text-sm">Carregando…</p>
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />

  return children
}
