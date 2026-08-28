import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Field, TextInput, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useAuth } from '@/contexts/AuthContext'
import { useCreateProject, useDeleteProject, useProjects } from '@/features/dashboard/useProjects'

export function DashboardPage() {
  const { data: projects, isLoading } = useProjects()
  const createProject = useCreateProject()
  const deleteProject = useDeleteProject()
  const { signOut, user } = useAuth()

  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    await createProject.mutateAsync({ name: name.trim(), description: description.trim() })
    setName('')
    setDescription('')
    setCreating(false)
  }

  return (
    <div className="min-h-screen bg-ink text-paper">
      <header className="flex items-center justify-between border-b-2 border-ink px-6 py-4 sm:px-10">
        <div className="text-display flex items-center gap-2 text-lg">
          <span className="flex h-7 w-7 items-center justify-center border-2 border-ink bg-accent-yellow text-ink">
            G
          </span>
          GDScribe
        </div>
        <div className="flex items-center gap-3">
          <span className="text-label hidden text-xs text-paper/50 sm:inline">{user?.email}</span>
          <Button variant="ghost" size="sm" onClick={signOut}>
            Sair
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10 sm:px-10">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-display text-2xl sm:text-3xl">Seus projetos</h1>
          <Button icon={<Plus size={16} />} onClick={() => setCreating(true)}>
            Novo projeto
          </Button>
        </div>

        {isLoading && <p className="text-label text-sm text-paper/50">Carregando…</p>}

        {!isLoading && projects?.length === 0 && (
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
            <Card key={project.id} className="flex flex-col justify-between">
              <div>
                <h2 className="text-display mb-1.5 text-lg">{project.name}</h2>
                <p className="mb-4 line-clamp-3 text-sm text-paper/60">
                  {project.description || 'Sem descrição.'}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <Link to={`/project/${project.id}/gdd`}>
                  <Button size="sm">Abrir</Button>
                </Link>
                <button
                  type="button"
                  onClick={() => setPendingDelete(project.id)}
                  aria-label="Excluir projeto"
                  className="cursor-pointer border-2 border-ink bg-transparent p-1.5 text-paper/50 hover:bg-accent-red hover:text-paper"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      </main>

      <Modal open={creating} onClose={() => setCreating(false)} title="Novo projeto">
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
    </div>
  )
}
