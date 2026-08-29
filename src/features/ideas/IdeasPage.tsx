import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { clsx } from 'clsx'
import { useOutletContext } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Field, Select, TextInput } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Badge, accentFromString } from '@/components/ui/Badge'
import { Tabs } from '@/components/ui/Tabs'
import { RichTextEditor } from '@/components/RichTextEditor'
import { TagInput } from '@/components/TagInput'
import { SectorPicker, matchesSectorFilter } from '@/components/SectorPicker'
import { isHtmlEmpty, stripHtml } from '@/lib/html'
import { IDEA_STATUSES, type Idea, type IdeaStatus, type Project } from '@/lib/types'
import { useCreateIdea, useDeleteIdea, useIdeas, useUpdateIdea } from '@/features/ideas/useIdeas'
import { useProjectSectors } from '@/features/settings/useProjectSectors'

const FILTER_ITEMS = [{ value: 'all' as const, label: 'Todas' }, ...IDEA_STATUSES]

export function IdeasPage() {
  const { project } = useOutletContext<{ project: Project }>()
  const { data: ideas, isLoading } = useIdeas(project.id)
  const createIdea = useCreateIdea(project.id)
  const updateIdea = useUpdateIdea(project.id)
  const deleteIdea = useDeleteIdea(project.id)
  const { data: sectors } = useProjectSectors(project.id)

  const [statusFilter, setStatusFilter] = useState<IdeaStatus | 'all'>('all')
  const [tagFilter, setTagFilter] = useState<string[]>([])
  const [sectorFilter, setSectorFilter] = useState<string[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Idea | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [ideaSectors, setIdeaSectors] = useState<string[]>([])
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  const allTags = useMemo(
    () => Array.from(new Set((ideas ?? []).flatMap((i) => i.tags))).sort(),
    [ideas],
  )

  const filtered = useMemo(
    () =>
      (ideas ?? []).filter((i) => {
        const matchesStatus = statusFilter === 'all' || i.status === statusFilter
        const matchesTags = tagFilter.length === 0 || tagFilter.some((t) => i.tags.includes(t))
        const matchesSector = matchesSectorFilter(i.sectors, sectorFilter)
        return matchesStatus && matchesTags && matchesSector
      }),
    [ideas, statusFilter, tagFilter, sectorFilter],
  )

  function toggleTag(tag: string) {
    setTagFilter((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  function openCreate() {
    setEditing(null)
    setTitle('')
    setBody('')
    setTags([])
    setIdeaSectors([])
    setModalOpen(true)
  }

  function openEdit(idea: Idea) {
    setEditing(idea)
    setTitle(idea.title)
    setBody(idea.body ?? '')
    setTags(idea.tags)
    setIdeaSectors(idea.sectors)
    setModalOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    if (editing) {
      await updateIdea.mutateAsync({
        id: editing.id,
        title: title.trim(),
        body: body.trim() || null,
        tags,
        sectors: ideaSectors,
      })
    } else {
      await createIdea.mutateAsync({ title: title.trim(), body: body.trim(), tags, sectors: ideaSectors })
    }
    setModalOpen(false)
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-display text-2xl">Hub de Ideias</h1>
        <Button size="sm" icon={<Plus size={16} />} onClick={openCreate}>
          Nova ideia
        </Button>
      </div>

      <Tabs items={FILTER_ITEMS} value={statusFilter} onChange={setStatusFilter} />

      {allTags.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-label text-[10px] text-canvas-fg/40">Tags:</span>
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={clsx(
                'text-label border-2 border-line px-1.5 py-0.5 text-[10px]',
                tagFilter.includes(tag)
                  ? 'bg-accent-blue text-ink'
                  : 'bg-transparent text-canvas-fg/50 hover:text-canvas-fg',
              )}
            >
              {tag}
            </button>
          ))}
          {tagFilter.length > 0 && (
            <button
              type="button"
              onClick={() => setTagFilter([])}
              className="text-label text-[10px] text-canvas-fg/40 underline hover:text-canvas-fg"
            >
              limpar
            </button>
          )}
        </div>
      )}

      {(sectors ?? []).length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-label text-[10px] text-canvas-fg/40">Setor:</span>
          <SectorPicker value={sectorFilter} onChange={setSectorFilter} sectors={sectors ?? []} />
        </div>
      )}

      {isLoading && <p className="text-label mt-6 text-sm text-canvas-fg/50">Carregando…</p>}

      {!isLoading && filtered.length === 0 && (
        <div className="mt-6">
          <EmptyState title="Nenhuma ideia por aqui" description="Jogue qualquer ideia solta antes que ela vire escopo." />
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((idea) => {
          const statusMeta = IDEA_STATUSES.find((s) => s.value === idea.status)!
          return (
            <div
              key={idea.id}
              onClick={() => openEdit(idea)}
              className="cursor-pointer border-2 border-line bg-surface p-4 shadow-brutal-sm transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span
                  className="text-label border-2 border-line px-1.5 py-0.5 text-[10px] text-ink"
                  style={{ backgroundColor: statusMeta.color }}
                >
                  {statusMeta.label}
                </span>
              </div>
              <h3 className="text-display mb-1 text-base">{idea.title}</h3>
              {idea.body && !isHtmlEmpty(idea.body) && (
                <p className="mb-2 line-clamp-3 text-sm text-canvas-fg/60">{stripHtml(idea.body)}</p>
              )}
              {idea.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {idea.tags.map((tag) => (
                    <Badge key={tag} accent={accentFromString(tag)}>
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar ideia' : 'Nova ideia'}
        isDirty={
          editing
            ? title !== editing.title ||
              body !== (editing.body ?? '') ||
              JSON.stringify(tags) !== JSON.stringify(editing.tags) ||
              JSON.stringify(ideaSectors) !== JSON.stringify(editing.sectors)
            : Boolean(title.trim() || body.trim() || tags.length > 0)
        }
      >
        <form onSubmit={handleSubmit}>
          <Field label="Título">
            <TextInput required autoFocus value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Descrição" hint="Opcional — aceita Markdown e imagens">
            <RichTextEditor projectId={project.id} value={body} onChange={setBody} minHeight={140} />
          </Field>
          <Field label="Tags">
            <TagInput value={tags} onChange={setTags} suggestions={allTags} placeholder="combate, ui, som…" />
          </Field>
          <Field label="Setores">
            <SectorPicker value={ideaSectors} onChange={setIdeaSectors} sectors={sectors ?? []} />
          </Field>
          {editing && (
            <Field label="Status">
              <Select
                value={editing.status}
                onChange={(e) => {
                  const status = e.target.value as IdeaStatus
                  setEditing({ ...editing, status })
                  updateIdea.mutate({ id: editing.id, status })
                }}
              >
                {IDEA_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <div className="flex justify-between gap-2">
            {editing && (
              <Button type="button" variant="danger" onClick={() => setPendingDelete(editing.id)}>
                Excluir
              </Button>
            )}
            <div className={clsx('flex gap-2', !editing && 'ml-auto')}>
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
          if (pendingDelete) deleteIdea.mutate(pendingDelete)
          setModalOpen(false)
        }}
        title="Excluir ideia"
        description="Essa ação não pode ser desfeita."
        confirmLabel="Excluir"
      />
    </div>
  )
}
