import { useState } from 'react'
import { AlertTriangle, Plus, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Field, Select, TextInput, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Badge } from '@/components/ui/Badge'
import { UserMenu } from '@/components/UserMenu'
import { Logo } from '@/components/Logo'
import { useAuth } from '@/contexts/AuthContext'
import { STEAM_GENRES } from '@/lib/types'
import { useCreateProject, useDeleteProject, useProjects } from '@/features/dashboard/useProjects'
import { AllProjectsCalendarCard } from '@/features/dashboard/AllProjectsCalendarCard'

export function DashboardPage() {
  const { data: projects, isLoading, isError, error, refetch } = useProjects()
  const createProject = useCreateProject()
  const deleteProject = useDeleteProject()
  const { signOut, user } = useAuth()

  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [primaryGenre, setPrimaryGenre] = useState('')
  const [secondaryGenre, setSecondaryGenre] = useState('')
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  const displayName = (user?.user_metadata?.display_name as string | undefined)?.trim()

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    await createProject.mutateAsync({
      name: name.trim(),
      description: description.trim(),
      primaryGenre,
      secondaryGenre,
    })
    setName('')
    setDescription('')
    setPrimaryGenre('')
    setSecondaryGenre('')
    setCreating(false)
  }

  return (
    <div className="min-h-screen bg-canvas text-canvas-fg">
      <header className="flex items-center justify-between border-b-2 border-line px-6 py-4 sm:px-10">
        <div className="text-display flex items-center gap-2 text-lg">
          <Logo />
          GDScribe
        </div>
        <div className="flex items-center gap-3">
          <span className="text-label hidden text-xs text-canvas-fg/50 sm:inline">
            {displayName || user?.email}
          </span>
          <Button variant="ghost" size="sm" onClick={signOut}>
            Sair
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10 sm:px-10">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-display text-2xl sm:text-3xl">
            {displayName ? `Projetos de ${displayName}` : 'Seus projetos'}
          </h1>
          <Button icon={<Plus size={16} />} onClick={() => setCreating(true)}>
            Novo projeto
          </Button>
        </div>

        <AllProjectsCalendarCard />

        {isLoading && <p className="text-label text-sm text-canvas-fg/50">Carregando…</p>}

        {isError && (
          <div className="flex items-start gap-3 border-2 border-accent-red bg-accent-red/10 p-4">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-accent-red" />
            <div>
              <p className="text-sm font-semibold text-accent-red">Não deu para carregar seus projetos</p>
              <p className="mt-1 text-xs text-canvas-fg/60">
                {error instanceof Error ? error.message : 'Erro desconhecido.'} — confira se rodou a versão
                mais recente de <code>supabase/schema.sql</code> no seu projeto Supabase.
              </p>
              <Button size="sm" variant="ghost" className="mt-2" onClick={() => refetch()}>
                Tentar de novo
              </Button>
            </div>
          </div>
        )}

        {!isLoading && !isError && projects?.length === 0 && (
          <EmptyState
            title="Nenhum projeto ainda"
            description="Crie seu primeiro projeto para começar a documentar seu jogo."
            action={
              <Button icon={<Plus size={16} />} onClick={() => setCreating(true)}>
                Criar projeto
              </Button>
            }
          />
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects?.map((project) => (
            <Card key={project.id} padded={false} className="flex flex-col justify-between overflow-hidden">
              {project.cover_image_url ? (
                <img
                  src={project.cover_image_url}
                  alt=""
                  className="h-28 w-full border-b-2 border-line object-cover"
                />
              ) : (
                <div className="flex h-28 w-full items-center justify-center border-b-2 border-line bg-canvas">
                  <Logo />
                </div>
              )}
              <div className="flex flex-1 flex-col justify-between p-4">
              <div>
                <h2 className="text-display mb-1.5 text-lg">{project.name}</h2>
                {(project.primary_genre || project.secondary_genre) && (
                  <div className="mb-2 flex flex-wrap gap-1">
                    {project.primary_genre && <Badge accent="blue">{project.primary_genre}</Badge>}
                    {project.secondary_genre && <Badge accent="purple">{project.secondary_genre}</Badge>}
                  </div>
                )}
                <p className="mb-4 line-clamp-3 text-sm text-canvas-fg/60">
                  {project.description || 'Sem descrição.'}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <Link to={`/project/${project.id}/overview`}>
                  <Button size="sm">Abrir</Button>
                </Link>
                <button
                  type="button"
                  onClick={() => setPendingDelete(project.id)}
                  aria-label="Excluir projeto"
                  className="cursor-pointer border-2 border-line bg-transparent p-1.5 text-canvas-fg/50 hover:bg-accent-red hover:text-canvas-fg"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              </div>
            </Card>
          ))}
        </div>
      </main>

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Novo projeto"
        isDirty={Boolean(name.trim() || description.trim() || primaryGenre || secondaryGenre)}
      >
        <form onSubmit={handleCreate}>
          <Field label="Nome do jogo">
            <TextInput
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Fool's Debt"
            />
          </Field>
          <Field label="Descrição" hint="Opcional">
            <Textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Um duelo de cartas roguelike sobre dívidas e barganhas…"
            />
          </Field>
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Gênero primário" hint="Opcional">
              <Select value={primaryGenre} onChange={(e) => setPrimaryGenre(e.target.value)}>
                <option value="">—</option>
                {STEAM_GENRES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Gênero secundário" hint="Opcional">
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
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setCreating(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createProject.isPending}>
              {createProject.isPending ? 'Criando…' : 'Criar projeto'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && deleteProject.mutate(pendingDelete)}
        title="Excluir projeto"
        description="Essa ação apaga o projeto e todo o conteúdo relacionado (módulos, inventário, kanban, ideias). Não pode ser desfeita."
        confirmLabel="Excluir"
      />

      <UserMenu />
    </div>
  )
}
