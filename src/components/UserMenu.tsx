import { useState } from 'react'
import { User as UserIcon } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, Select, TextInput } from '@/components/ui/Input'
import { Tabs } from '@/components/ui/Tabs'
import { useAuth } from '@/contexts/AuthContext'
import { useAppTheme } from '@/contexts/AppThemeContext'
import { useToast } from '@/contexts/ToastContext'
import { supabase } from '@/lib/supabase'
import type { AppThemeMode } from '@/lib/types'
import { ProjectThemePanel } from '@/features/theme-settings/ProjectThemePanel'

const THEME_OPTIONS: { value: AppThemeMode; label: string }[] = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Escuro' },
  { value: 'auto', label: 'Automático' },
]

export function UserMenu({ projectId }: { projectId?: string }) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'profile' | 'project-theme'>('profile')

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Menu do usuário"
        className="fixed bottom-5 right-5 z-40 flex h-12 w-12 cursor-pointer items-center justify-center border-2 border-ink bg-accent-yellow text-ink shadow-brutal hover:-translate-x-0.5 hover:-translate-y-0.5"
      >
        <UserIcon size={20} />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Configurações">
        {projectId && (
          <div className="mb-4">
            <Tabs
              items={[
                { value: 'profile', label: 'Perfil' },
                { value: 'project-theme', label: 'Tema do projeto' },
              ]}
              value={tab}
              onChange={setTab}
            />
          </div>
        )}

        {tab === 'profile' && <ProfileTab />}
        {tab === 'project-theme' && projectId && <ProjectThemePanel projectId={projectId} />}
      </Modal>
    </>
  )
}

function ProfileTab() {
  const { user } = useAuth()
  const { mode, setMode } = useAppTheme()
  const toast = useToast()
  const [displayName, setDisplayName] = useState(
    (user?.user_metadata?.display_name as string | undefined) ?? '',
  )
  const [saving, setSaving] = useState(false)

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ data: { display_name: displayName.trim() } })
    setSaving(false)
    if (error) toast.error(`Falha ao salvar nome: ${error.message}`)
    else toast.success('Nome atualizado.')
  }

  return (
    <div>
      <form onSubmit={handleSaveName} className="mb-5">
        <Field label="Como você quer ser chamado" hint={user?.email}>
          <div className="flex gap-2">
            <TextInput
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Seu nome"
              className="flex-1"
            />
            <Button type="submit" size="sm" disabled={saving}>
              Salvar
            </Button>
          </div>
        </Field>
      </form>

      <Field label="Tema do app">
        <Select value={mode} onChange={(e) => setMode(e.target.value as AppThemeMode)}>
          {THEME_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </Field>
    </div>
  )
}
