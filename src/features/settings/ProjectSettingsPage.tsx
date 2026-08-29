import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { useOutletContext } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Field, Select, TextInput, Textarea } from '@/components/ui/Input'
import { Tabs } from '@/components/ui/Tabs'
import { STEAM_GENRES, type Project, type ProjectPhase } from '@/lib/types'
import { useUpdateProject } from '@/features/dashboard/useProjects'
import {
  useCreatePhase,
  useDeletePhase,
  useProjectPhases,
  useRenamePhase,
  useReorderPhases,
} from '@/features/settings/useProjectPhases'
import { ProjectThemePanel } from '@/features/theme-settings/ProjectThemePanel'
import { useToast } from '@/contexts/ToastContext'

type Tab = 'info' | 'phases' | 'theme'

export function ProjectSettingsPage() {
  const { project } = useOutletContext<{ project: Project }>()
  const updateProject = useUpdateProject(project.id)
  const { data: phases } = useProjectPhases(project.id)
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
          { value: 'phases', label: 'Fases' },
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
                  {(phases ?? []).map((p) => (
                    <option key={p.key} value={p.key}>
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

      {tab === 'phases' && (
        <Card className="mt-5">
          <PhaseManager projectId={project.id} phases={phases ?? []} />
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

function PhaseManager({ projectId, phases }: { projectId: string; phases: ProjectPhase[] }) {
  const createPhase = useCreatePhase(projectId)
  const renamePhase = useRenamePhase(projectId)
  const deletePhase = useDeletePhase(projectId)
  const reorderPhases = useReorderPhases(projectId)
  const [newLabel, setNewLabel] = useState('')
  const [pendingDelete, setPendingDelete] = useState<ProjectPhase | null>(null)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newLabel.trim()) return
    await createPhase.mutateAsync(newLabel.trim())
    setNewLabel('')
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir
    if (target < 0 || target >= phases.length) return
    const reordered = [...phases]
    const [item] = reordered.splice(index, 1)
    reordered.splice(target, 0, item)
    reorderPhases.mutate(reordered.map((p, i) => ({ id: p.id, sort_order: i })))
  }

  return (
    <div>
      <p className="mb-4 text-xs text-canvas-fg/60">
        As fases usadas nos módulos do GDD, no filtro do documento e na fase atual do projeto.
        Renomeie, reordene, adicione ou remova como quiser — vale em todo o projeto (o filtro
        "Todas as fases" continua sempre disponível e não é uma fase de verdade).
      </p>
      <div className="space-y-2">
        {phases.map((phase, i) => (
          <div key={phase.id} className="flex items-center gap-2 border-2 border-line/40 p-2">
            <div className="flex flex-col">
              <button
                type="button"
                disabled={i === 0}
                onClick={() => move(i, -1)}
                aria-label="Mover para cima"
                className="cursor-pointer text-canvas-fg/50 hover:text-canvas-fg disabled:opacity-20"
              >
                <ArrowUp size={12} />
              </button>
              <button
                type="button"
                disabled={i === phases.length - 1}
                onClick={() => move(i, 1)}
                aria-label="Mover para baixo"
                className="cursor-pointer text-canvas-fg/50 hover:text-canvas-fg disabled:opacity-20"
              >
                <ArrowDown size={12} />
              </button>
            </div>
            <TextInput
              defaultValue={phase.label}
              onBlur={(e) => {
                if (e.target.value.trim() && e.target.value !== phase.label) {
                  renamePhase.mutate({ id: phase.id, label: e.target.value.trim() })
                }
              }}
              className="flex-1"
            />
            <button
              type="button"
              onClick={() => setPendingDelete(phase)}
              aria-label="Excluir fase"
              className="cursor-pointer border-2 border-line p-1.5 text-canvas-fg/50 hover:bg-accent-red hover:text-canvas-fg"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>

      <form onSubmit={handleAdd} className="mt-3 flex gap-2">
        <TextInput
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="Nova fase (ex: Beta fechada, Pós-lançamento…)"
          className="flex-1"
        />
        <Button type="submit" size="sm" icon={<Plus size={13} />} disabled={createPhase.isPending}>
          Adicionar
        </Button>
      </form>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && deletePhase.mutate(pendingDelete.id)}
        title="Excluir fase"
        description="Módulos do GDD que estavam nessa fase não são apagados, mas ficam com uma fase que não existe mais até você reatribuí-los."
        confirmLabel="Excluir"
      />
    </div>
  )
}
