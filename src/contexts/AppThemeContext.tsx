import { createContext, type ReactNode, use, useEffect, useState } from 'react'
import type { AppThemeMode } from '@/lib/types'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

const STORAGE_KEY = 'gdscribe.appTheme'

interface AppThemeContextValue {
  mode: AppThemeMode
  setMode: (mode: AppThemeMode) => void
}

const AppThemeContext = createContext<AppThemeContextValue | null>(null)

function applyMode(mode: AppThemeMode) {
  const root = document.documentElement
  if (mode === 'auto') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', mode)
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [mode, setModeState] = useState<AppThemeMode>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'light' || stored === 'dark' || stored === 'auto' ? stored : 'auto'
  })

  useEffect(() => {
    applyMode(mode)
  }, [mode])

  // adota a preferência salva na conta assim que ela carregar (ex: outro dispositivo)
  useEffect(() => {
    const remote = user?.user_metadata?.app_theme as AppThemeMode | undefined
    if (remote && remote !== mode) setModeState(remote)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  function setMode(next: AppThemeMode) {
    setModeState(next)
    localStorage.setItem(STORAGE_KEY, next)
    if (user) supabase.auth.updateUser({ data: { app_theme: next } })
  }

  return <AppThemeContext value={{ mode, setMode }}>{children}</AppThemeContext>
}

export function useAppTheme() {
  const ctx = use(AppThemeContext)
  if (!ctx) throw new Error('useAppTheme deve ser usado dentro de AppThemeProvider')
  return ctx
}
