import { useMemo, useState } from 'react'
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import { ArrowLeft, ArrowRight, ExternalLink, Filter, Plus, Upload, X } from 'lucide-react'
import { clsx } from 'clsx'
import { useOutletContext } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Field, TextInput } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { SidePanel } from '@/components/ui/SidePanel'
import { ChecklistEditor } from '@/components/ChecklistEditor'
import { RichTextEditor } from '@/components/RichTextEditor'
import { ImageLightbox } from '@/components/ImageLightbox'
import { ClipboardImageButton } from '@/components/ClipboardImageButton'
import { TagInput } from '@/components/TagInput'
import { useUploadImage } from '@/lib/useUploadImage'
import { useDndSensors } from '@/lib/useDndSensors'
import type { ChecklistItem, GameReference, Project } from '@/lib/types'
import {
  useCreateReference,
  useDeleteReference,
  useReferences,
  useReorderReferences,
  useUpdateReference,
} from '@/features/references/useReferences'
import { ReferenceCard } from '@/features/references/ReferenceCard'

const ASIDE_WIDTH_KEY = 'gdscribe.referencesAsideWidth'
const MIN_ASIDE_WIDTH = 160
const MAX_ASIDE_WIDTH = 420

export function ReferencesPage() {
  const { project } = useOutletContext<{ project: Project }>()
  const { data: references, isLoading } = useReferences(project.id)
  const createReference = useCreateReference(project.id)
  const updateReference = useUpdateReference(project.id)
  const deleteReference = useDeleteReference(project.id)
  const reorderReferences = useReorderReferences(project.id)
  const { uploadMany, uploading } = useUploadImage(project.id)
  const sensors = useDndSensors()
  const [asideWidth, setAsideWidth] = useState(() => {
    const stored = Number(localStorage.getItem(ASIDE_WIDTH_KEY))
    return stored >= MIN_ASIDE_WIDTH && stored <= MAX_ASIDE_WIDTH ? stored : 200
  })

  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [editing, setEditing] = useState<GameReference | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editSourceUrl, setEditSourceUrl] = useState('')
  const [editImages, setEditImages] = useState<string[]>([])
  const [editTags, setEditTags] = useState<string[]>([])
  const [editNotes, setEditNotes] = useState('')
  const [editChecklist, setEditChecklist] = useState<ChecklistItem[]>([])
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [tagFilter, setTagFilter] = useState<string[]>([])

  const allTags = useMemo(
    () => Array.from(new Set((references ?? []).flatMap((r) => r.tags))).sort(),
    [references],
  )

  const filtered = useMemo(
    () =>
      (references ?? []).filter((r) => tagFilter.length === 0 || tagFilter.some((t) => r.tags.includes(t))),
    [references, tagFilter],
  )

  function toggleTag(tag: string) {
    setTagFilter((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  function handleAsideResizeStart(e: React.PointerEvent) {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = asideWidth
    function handleMove(ev: PointerEvent) {
      const next = Math.min(MAX_ASIDE_WIDTH, Math.max(MIN_ASIDE_WIDTH, startWidth + (ev.clientX - startX)))
      setAsideWidth(next)
    }
    function handleUp() {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      setAsideWidth((w) => {
        localStorage.setItem(ASIDE_WIDTH_KEY, String(w))
        return w
      })
    }
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
  }

  function handleReorderEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id || !references) return
    const filteredIds = filtered.map((r) => r.id)
    const oldIndex = filteredIds.indexOf(active.id as string)
    const newIndex = filteredIds.indexOf(over.id as string)
    if (oldIndex < 0 || newIndex < 0) return
    const reordered = [...filtered]
    const [moved] = reordered.splice(oldIndex, 1)
    reordered.splice(newIndex, 0, moved)
    reorderReferences.mutate(reordered.map((r, i) => ({ id: r.id, sort_order: i })))
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    const created = await createReference.mutateAsync(newTitle.trim())
    setNewTitle('')
    setCreating(false)
    openEdit(created)
  }

  function openEdit(ref: GameReference) {
    setEditing(ref)
    setEditTitle(ref.title)
    setEditSourceUrl(ref.source_url ?? '')
    setEditImages(ref.image_urls.length > 0 ? ref.image_urls : ref.image_url ? [ref.image_url] : [])
    setEditTags(ref.tags)
    setEditNotes(ref.notes)
    setEditChecklist(ref.checklist)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    await updateReference.mutateAsync({
      id: editing.id,
      title: editTitle.trim(),
      source_url: editSourceUrl.trim() || null,
      image_url: editImages[0] ?? null,
      image_urls: editImages,
      tags: editTags,
      notes: editNotes,
      checklist: editChecklist,
    })
    setEditing(null)
  }

  async function handleImageUpload(files: FileList | null) {
    if (!files || files.length === 0) return
    const urls = await uploadMany(Array.from(files), 'reference-images')
    if (urls.length > 0) setEditImages((prev) => [...prev, ...urls])
  }

  async function handleClipboardImage(file: File) {
    const urls = await uploadMany([file], 'reference-images')
    if (urls.length > 0) setEditImages((prev) => [...prev, ...urls])
  }

  function removeImage(url: string) {
    setEditImages((prev) => prev.filter((u) => u !== url))
    setLightboxIndex(null)
  }

  function moveImage(index: number, dir: -1 | 1) {
    const target = index + dir
    if (target < 0 || target >= editImages.length) return
    setEditImages((prev) => {
      const next = [...prev]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  async function handlePasteImage(e: React.ClipboardEvent) {
    const files = Array.from(e.clipboardData?.items ?? [])
      .filter((item) => item.type.startsWith('image/'))
      .map((item) => item.getAsFile())
      .filter((f): f is File => f !== null)
    if (files.length === 0) return
    e.preventDefault()
    const urls = await uploadMany(files, 'reference-images')
    if (urls.length > 0) setEditImages((prev) => [...prev, ...urls])
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-display text-2xl">Referências</h1>
        <Button size="sm" icon={<Plus size={16} />} onClick={() => setCreating(true)}>
          Nova referência
        </Button>
      </div>

      <div className="flex flex-col gap-5 lg:flex-row">
        <aside
          className="relative w-full shrink-0 space-y-4 border-2 border-line bg-surface p-3 lg:sticky lg:top-4 lg:w-[var(--aside-w)] lg:self-start"
          style={{ '--aside-w': `${asideWidth}px` } as React.CSSProperties}
        >
          <div className="flex items-center gap-1.5 text-canvas-fg/70">
            <Filter size={13} />
            <span className="text-label text-[11px]">Filtrar referências</span>
          </div>

          {allTags.length > 0 ? (
            <div>
              <p className="text-label mb-1.5 text-[10px] text-canvas-fg/50">Tags</p>
              <div className="flex flex-wrap gap-1">
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
              </div>
            </div>
          ) : (
            <p className="text-xs text-canvas-fg/40">Sem tags ainda.</p>
          )}

          {tagFilter.length > 0 && (
            <button
              type="button"
              onClick={() => setTagFilter([])}
              className="text-label text-[11px] text-canvas-fg/40 underline hover:text-canvas-fg"
            >
              limpar filtros
            </button>
          )}

          <div
            onPointerDown={handleAsideResizeStart}
            title="Arraste para redimensionar"
            className="absolute right-0 top-0 hidden h-full w-1.5 cursor-ew-resize touch-none hover:bg-accent-yellow lg:block"
          />
        </aside>

        <div className="min-w-0 flex-1">
          {isLoading && <p className="text-label text-sm text-canvas-fg/50">Carregando…</p>}

          {!isLoading && filtered.length === 0 && (
            <EmptyState
              title="Nenhuma referência ainda"
              description="Guarde jogos, filmes, artes — e marque o que você quer trazer pro seu jogo."
              action={
                <Button icon={<Plus size={16} />} onClick={() => setCreating(true)}>
                  Adicionar referência
                </Button>
              }
            />
          )}

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleReorderEnd}>
            <SortableContext items={filtered.map((r) => r.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((ref) => (
                  <ReferenceCard key={ref.id} reference={ref} onClick={() => openEdit(ref)} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      </div>

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Nova referência"
        isDirty={Boolean(newTitle.trim())}
      >
        <form onSubmit={handleCreate}>
          <Field label="Título">
            <TextInput
              required
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Ex: Hades — combate corpo a corpo"
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setCreating(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createReference.isPending}>
              Criar
            </Button>
          </div>
        </form>
      </Modal>

      <SidePanel
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Editar referência"
        isDirty={Boolean(
          editing &&
            (editTitle !== editing.title ||
              editSourceUrl !== (editing.source_url ?? '') ||
              JSON.stringify(editImages) !== JSON.stringify(editing.image_urls) ||
              JSON.stringify(editTags) !== JSON.stringify(editing.tags) ||
              editNotes !== editing.notes ||
              JSON.stringify(editChecklist) !== JSON.stringify(editing.checklist)),
        )}
      >
        <form onSubmit={handleSave} onPaste={handlePasteImage}>
          <Field label="Título">
            <TextInput required value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
          </Field>

          <Field label="Link da fonte" hint="Opcional">
            <div className="flex items-center gap-2">
              <TextInput
                value={editSourceUrl}
                onChange={(e) => setEditSourceUrl(e.target.value)}
                placeholder="https://…"
                className="flex-1"
              />
              {editSourceUrl && (
                <a href={editSourceUrl} target="_blank" rel="noreferrer" className="shrink-0 text-canvas-fg/50 hover:text-canvas-fg">
                  <ExternalLink size={16} />
                </a>
              )}
            </div>
          </Field>

          <Field label="Imagens" hint="Pode enviar várias de uma vez, colar com Ctrl+V, e clicar numa imagem pra ver em foco">
            <div className="space-y-2">
              {editImages.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {editImages.map((url, i) => (
                    <div key={url} className="group relative">
                      <button
                        type="button"
                        onClick={() => setLightboxIndex(i)}
                        className="block h-16 w-full cursor-pointer"
                        aria-label="Ver imagem em foco"
                      >
                        <img src={url} alt="" className="h-16 w-full border-2 border-line object-cover" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeImage(url)}
                        aria-label="Remover imagem"
                        className="absolute right-0.5 top-0.5 cursor-pointer border border-ink bg-accent-red p-0.5 text-canvas-fg opacity-0 group-hover:opacity-100"
                      >
                        <X size={10} />
                      </button>
                      <div className="absolute bottom-0.5 left-0.5 flex gap-0.5 opacity-0 group-hover:opacity-100">
                        <button
                          type="button"
                          disabled={i === 0}
                          onClick={() => moveImage(i, -1)}
                          aria-label="Mover imagem para a esquerda"
                          className="cursor-pointer border border-ink bg-paper p-0.5 text-ink disabled:opacity-30"
                        >
                          <ArrowLeft size={10} />
                        </button>
                        <button
                          type="button"
                          disabled={i === editImages.length - 1}
                          onClick={() => moveImage(i, 1)}
                          aria-label="Mover imagem para a direita"
                          className="cursor-pointer border border-ink bg-paper p-0.5 text-ink disabled:opacity-30"
                        >
                          <ArrowRight size={10} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      handleImageUpload(e.target.files)
                      e.target.value = ''
                    }}
                  />
                  <span className="text-label inline-flex cursor-pointer items-center gap-1.5 border-2 border-line px-2.5 py-1.5 text-[11px] text-canvas-fg/70 hover:bg-accent-blue hover:text-ink">
                    <Upload size={12} />
                    {uploading ? 'Enviando…' : 'Enviar imagens'}
                  </span>
                </label>
                <ClipboardImageButton onImage={handleClipboardImage} label="Colar" />
              </div>
            </div>
          </Field>

          <Field label="Tags">
            <TagInput value={editTags} onChange={setEditTags} suggestions={allTags} placeholder="arte, combate, som…" />
          </Field>

          <Field label="Observações" hint="Aceita Markdown e imagens">
            <RichTextEditor projectId={project.id} value={editNotes} onChange={setEditNotes} minHeight={140} />
          </Field>

          <Field label="O que eu quero aproveitar dessa referência">
            <ChecklistEditor items={editChecklist} onChange={setEditChecklist} />
          </Field>

          <div className="mt-4 flex justify-between gap-2">
            <Button
              type="button"
              variant="danger"
              onClick={() => editing && setPendingDelete(editing.id)}
            >
              Excluir
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={updateReference.isPending}>
                Salvar
              </Button>
            </div>
          </div>
        </form>
      </SidePanel>

      <ImageLightbox
        images={editImages}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onIndexChange={setLightboxIndex}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) deleteReference.mutate(pendingDelete)
          setEditing(null)
        }}
        title="Excluir referência"
        description="Essa ação não pode ser desfeita."
        confirmLabel="Excluir"
      />
    </div>
  )
}
