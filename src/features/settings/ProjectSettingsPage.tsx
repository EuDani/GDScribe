import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, Pencil, Plus, Rocket, Trash2 } from 'lucide-react'
import { useOutletContext } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Field, Select, TextInput, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Tabs } from '@/components/ui/Tabs'
import { STEAM_GENRES, type Project, type ProjectPhase, type ProjectRelease, type ProjectSector } from '@/lib/types'
import { useUpdateProject } from '@/features/dashboard/useProjects'
import { useUploadImage } from '@/lib/useUploadImage'
import {
  useCreatePhase,
  useDeletePhase,
  useProjectPhases,
  useRenamePhase,
  useReorderPhases,
} from '@/features/settings/useProjectPhases'
import {
  useCreateSector,
  useDeleteSector,
  useProjectSectors,
  useRenameSector,
  useReorderSectors,
} from '@/features/settings/useProjectSectors'
import {
  useCreateRelease,
  useDeleteRelease,
  useProjectReleases,
  useUpdateRelease,
} from '@/features/settings/useProjectReleases'
import { ProjectThemePanel } from '@/features/theme-settings/ProjectThemePanel'
import { useToast } from '@/contexts/ToastContext'

type Tab = 'info' | 'phases' | 'sectors' | 'releases' | 'theme'

function formatDate(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export function ProjectSettingsPage() {
  const { project } = useOutletContext<{ project: Project }>()
  const updateProject = useUpdateProject(project.id)
  const { data: phases } = useProjectPhases(project.id)
  const { data: sectors } = useProjectSectors(project.id)
  const { data: releases } = useProjectReleases(project.id)
  const toast = useToast()
  const { upload, uploading } = useUploadImage(project.id)

  const [tab, setTab] = useState<Tab>('info')
  const [name, setName] = useState(project.name)
  const [description, setDescription] = useState(project.description ?? '')
  const [status, setStatus] = useState(project.status)
  const [primaryGenre, setPrimaryGenre] = useState(project.primary_genre ?? '')
  const [secondaryGenre, setSecondaryGenre] = useState(project.secondary_genre ?? '')
  const [coverImageUrl, setCoverImageUrl] = useState(project.cover_image_url ?? '')

  useEffect(() => {
    setName(project.name)
    setDescription(project.description ?? '')
    setStatus(project.status)
    setPrimaryGenre(project.primary_genre ?? '')
    setSecondaryGenre(project.secondary_genre ?? '')
    setCoverImageUrl(project.cover_image_url ?? '')
  }, [project])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    await updateProject.mutateAsync({
      name: name.trim(),
      description: description.trim() || null,
      status,
      primary_genre: primaryGenre || null,
      secondary_genre: secondaryGenre || null,
      cover_image_url: coverImageUrl || null,
    })
    toast.success('Projeto atualizado.')
  }

  async function handleCoverUpload(file: File) {
    const url = await upload(file, 'project-cover')
    if (url) setCoverImageUrl(url)
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-display mb-5 text-2xl">Configurações do projeto</h1>

      <Tabs
        items={[
          { value: 'info', label: 'Informações' },
          { value: 'phases', label: 'Fases' },
          { value: 'sectors', label: 'Setores' },
          { value: 'releases', label: 'Lançamentos' },
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
            <Field label="Imagem de capa" hint="Aparece no cartão do projeto na tela inicial">
              <div className="flex items-center gap-3">
                {coverImageUrl && (
                  <img src={coverImageUrl} alt="" className="h-14 w-24 border-2 border-line object-cover" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  id="cover-image-input"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleCoverUpload(file)
                    e.target.value = ''
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={uploading}
                  onClick={() => document.getElementById('cover-image-input')?.click()}
                >
                  {uploading ? 'Enviando…' : 'Enviar imagem'}
                </Button>
                {coverImageUrl && (
                  <button
                    type="button"
                    onClick={() => setCoverImageUrl('')}
                    className="text-label text-[11px] text-canvas-fg/40 underline hover:text-canvas-fg"
                  >
                    remover
                  </button>
                )}
              </div>
            </Field>
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

      {tab === 'sectors' && (
        <Card className="mt-5">
          <SectorManager projectId={project.id} sectors={sectors ?? []} />
        </Card>
      )}

      {tab === 'releases' && (
        <Card className="mt-5">
          <ReleaseManager projectId={project.id} releases={releases ?? []} />
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

function SectorManager({ projectId, sectors }: { projectId: string; sectors: ProjectSector[] }) {
  const createSector = useCreateSector(projectId)
  const renameSector = useRenameSector(projectId)
  const deleteSector = useDeleteSector(projectId)
  const reorderSectors = useReorderSectors(projectId)
  const [newName, setNewName] = useState('')
  const [pendingDelete, setPendingDelete] = useState<ProjectSector | null>(null)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    await createSector.mutateAsync(newName.trim())
    setNewName('')
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir
    if (target < 0 || target >= sectors.length) return
    const reordered = [...sectors]
    const [item] = reordered.splice(index, 1)
    reordered.splice(target, 0, item)
    reorderSectors.mutate(reordered.map((s, i) => ({ id: s.id, sort_order: i })))
  }

  return (
    <div>
      <p className="mb-4 text-xs text-canvas-fg/60">
        Setores para marcar itens do GDD, Kanban, Inventário, Ideias e Calendário (ex: marketing,
        programação, arte). Cada item pode ter mais de um setor, e há sempre a opção "Todos" nos
        filtros. Renomeie, reordene, adicione ou remova como quiser.
      </p>
      <div className="space-y-2">
        {sectors.map((sector, i) => (
          <div key={sector.id} className="flex items-center gap-2 border-2 border-line/40 p-2">
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
                disabled={i === sectors.length - 1}
                onClick={() => move(i, 1)}
                aria-label="Mover para baixo"
                className="cursor-pointer text-canvas-fg/50 hover:text-canvas-fg disabled:opacity-20"
              >
                <ArrowDown size={12} />
              </button>
            </div>
            <span className="h-3 w-3 shrink-0 border border-line" style={{ backgroundColor: sector.color }} />
            <TextInput
              defaultValue={sector.name}
              onBlur={(e) => {
                if (e.target.value.trim() && e.target.value !== sector.name) {
                  renameSector.mutate({ id: sector.id, name: e.target.value.trim() })
                }
              }}
              className="flex-1"
            />
            <button
              type="button"
              onClick={() => setPendingDelete(sector)}
              aria-label="Excluir setor"
              className="cursor-pointer border-2 border-line p-1.5 text-canvas-fg/50 hover:bg-accent-red hover:text-canvas-fg"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>

      <form onSubmit={handleAdd} className="mt-3 flex gap-2">
        <TextInput
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Novo setor (ex: Marketing, Programação…)"
          className="flex-1"
        />
        <Button type="submit" size="sm" icon={<Plus size={13} />} disabled={createSector.isPending}>
          Adicionar
        </Button>
      </form>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && deleteSector.mutate(pendingDelete.id)}
        title="Excluir setor"
        description="Itens que tinham esse setor não são apagados, mas ficam com um setor que não existe mais até você reatribuí-los."
        confirmLabel="Excluir"
      />
    </div>
  )
}

function ReleaseManager({ projectId, releases }: { projectId: string; releases: ProjectRelease[] }) {
  const createRelease = useCreateRelease(projectId)
  const updateRelease = useUpdateRelease(projectId)
  const deleteRelease = useDeleteRelease(projectId)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ProjectRelease | null>(null)
  const [name, setName] = useState('')
  const [version, setVersion] = useState('')
  const [releaseDate, setReleaseDate] = useState('')
  const [notes, setNotes] = useState('')
  const [pendingDelete, setPendingDelete] = useState<ProjectRelease | null>(null)

  const sorted = [...releases].sort((a, b) => (a.release_date < b.release_date ? -1 : 1))
  const today = new Date().toISOString().slice(0, 10)

  function openCreate() {
    setEditing(null)
    setName('')
    setVersion('')
    setReleaseDate('')
    setNotes('')
    setModalOpen(true)
  }

  function openEdit(release: ProjectRelease) {
    setEditing(release)
    setName(release.name)
    setVersion(release.version ?? '')
    setReleaseDate(release.release_date)
    setNotes(release.notes ?? '')
    setModalOpen(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !releaseDate) return
    const input = {
      name: name.trim(),
      version: version.trim() || null,
      release_date: releaseDate,
      notes: notes.trim() || null,
    }
    if (editing) await updateRelease.mutateAsync({ id: editing.id, ...input })
    else await createRelease.mutateAsync(input)
    setModalOpen(false)
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-xs text-canvas-fg/60">
          Linha do tempo de lançamentos e atualizações do jogo — alfa, beta, versão de lançamento, patches, DLCs…
          cada um com seu próprio nome/versão e data.
        </p>
        <Button size="sm" icon={<Plus size={13} />} onClick={openCreate}>
          Novo
        </Button>
      </div>

      {sorted.length === 0 && (
        <EmptyState title="Nenhum lançamento cadastrado" description="Adicione alfa, beta, lançamento, patches, DLCs…" />
      )}

      <div className="space-y-2">
        {sorted.map((release) => {
          const past = release.release_date < today
          return (
            <div key={release.id} className="flex items-start gap-2 border-2 border-line/40 p-2.5">
              <Rocket size={14} className={`mt-0.5 shrink-0 ${past ? 'text-canvas-fg/30' : 'text-accent-blue'}`} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm font-semibold text-canvas-fg">{release.name}</span>
                  {release.version && (
                    <span className="text-label border border-line/40 px-1 py-0.5 text-[10px] text-canvas-fg/60">
                      {release.version}
                    </span>
                  )}
                  <span className={`text-label text-[10px] ${past ? 'text-canvas-fg/40' : 'text-accent-blue'}`}>
                    {formatDate(release.release_date)}
                  </span>
                </div>
                {release.notes && <p className="mt-0.5 text-xs text-canvas-fg/50">{release.notes}</p>}
              </div>
              <button
                type="button"
                onClick={() => openEdit(release)}
                aria-label="Editar lançamento"
                className="shrink-0 cursor-pointer border-2 border-line/40 p-1.5 text-canvas-fg/50 hover:border-line hover:text-canvas-fg"
              >
                <Pencil size={12} />
              </button>
              <button
                type="button"
                onClick={() => setPendingDelete(release)}
                aria-label="Excluir lançamento"
                className="shrink-0 cursor-pointer border-2 border-line/40 p-1.5 text-canvas-fg/50 hover:bg-accent-red hover:text-canvas-fg"
              >
                <Trash2 size={12} />
              </button>
            </div>
          )
        })}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar lançamento' : 'Novo lançamento'}
        isDirty={
          editing
            ? name !== editing.name ||
              version !== (editing.version ?? '') ||
              releaseDate !== editing.release_date ||
              notes !== (editing.notes ?? '')
            : Boolean(name.trim() || version.trim() || releaseDate || notes.trim())
        }
      >
        <form onSubmit={handleSave}>
          <Field label="Nome" hint="Ex: Alfa, Beta fechada, Lançamento, Patch de bugs, DLC: Reino Sombrio">
            <TextInput required autoFocus value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Versão" hint="Opcional">
              <TextInput value={version} onChange={(e) => setVersion(e.target.value)} placeholder="Ex: 0.1.0" />
            </Field>
            <Field label="Data">
              <TextInput type="date" required value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} />
            </Field>
          </div>
          <Field label="Notas" hint="Opcional">
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          <div className="flex justify-between gap-2">
            {editing && (
              <Button type="button" variant="danger" onClick={() => setPendingDelete(editing)}>
                Excluir
              </Button>
            )}
            <div className="ml-auto flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar</Button>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) deleteRelease.mutate(pendingDelete.id)
          setModalOpen(false)
        }}
        title="Excluir lançamento"
        description="Essa ação não pode ser desfeita."
        confirmLabel="Excluir"
      />
    </div>
  )
}
