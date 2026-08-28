import { createClient } from '@supabase/supabase-js'

// Vazio ("") em build-time (ex: secret do GitHub Actions não configurado)
// deve contar como "não configurado" — daí o `|| undefined` em vez de só `??`.
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || undefined
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || undefined

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

if (!isSupabaseConfigured) {
  console.warn(
    '[GDScribe] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY não configurados. Veja SUPABASE_SETUP.md.',
  )
}

export const supabase = createClient(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  supabaseAnonKey ?? 'placeholder-anon-key',
)

export const ASSETS_BUCKET = 'project-assets'
