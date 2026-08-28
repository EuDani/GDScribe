import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field, Select, TextInput, Textarea } from '@/components/ui/Input'
import { Tabs } from '@/components/ui/Tabs'
import { PHASES, STEAM_GENRES, type Project } from '@/lib/types'
import { useUpdateProject } from '@/features/dashboard/useProjects'
import { ProjectThemePanel } from '@/features/theme-settings/ProjectThemePanel'
import { useToast } from '@/contexts/ToastContext'

type Tab = 'info' | 'theme'

export function ProjectSettingsPage() {
  const { project } = useOutletContext<{ project: Project }>()
  const updateProject = useUpdateProject(project.id)
  const toast = useToast()

  const [tab, setTab] = useState<Tab>('info')
  const [name, setName] = useState(project.name)
  const [description, setDescription] = useState(project.description ?? '')
  const [status, setStatus] = useState(project.status)
  const [primaryGenre, setPrimaryGenre] = useState(project.primary_genre ?? '')
  const [secondaryGenre, setSecondaryGenre] = useState(project.secondary_genre ?? '')

  useEffect(() => {
    setName(project.name)
    setDescription(project.description ?? '')
    setStatus(project.status)
    setPrimaryGenre(project.primary_genre ?? '')
    setSecondaryGenre(project.secondary_genre ?? '')
  }, [project])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    await updateProject.mutateAsync({
      name: name.trim(),
      description: description.trim() || null,
      status,
      primary_genre: primaryGenre || null,
      secondary_genre: secondaryGenre || null,
    })
    toast.success('Projeto atualizado.')
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-display mb-5 text-2xl">Configurações do projeto</h1>

      <Tabs
        items={[
          { value: 'info', label: 'Informações' },
          { value: 'theme', label: 'Tema' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'info' && (
        <Card className="mt-5">
          <form onSubmit={handleSave}>
            <Field label="Nome do jogo">
              <TextInput required value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Descrição" hint="Opcional">
              <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
            <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Fase atual">
                <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                  {PHASES.filter((p) => p.value !== 'all').map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Gênero primário">
                <Select value={primaryGenre} onChange={(e) => setPrimaryGenre(e.target.value)}>
                  <option value="">—</option>
                  {STEAM_GENRES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Gênero secundário">
                <Select value={secondaryGenre} onChange={(e) => setSecondaryGenre(e.target.value)}>
                  <option value="">—</option>
                  {STEAM_GENRES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Button type="submit" disabled={updateProject.isPending}>
              {updateProject.isPending ? 'Salvando…' : 'Salvar'}
            </Button>
          </form>
        </Card>
      )}

      {tab === 'theme' && (
        <Card className="mt-5">
          <ProjectThemePanel projectId={project.id} />
        </Card>
      )}
    </div>
  )
}
