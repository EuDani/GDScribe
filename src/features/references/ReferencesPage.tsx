import { useState } from 'react'
import { ArrowLeft, ArrowRight, ExternalLink, Plus, Upload, X } from 'lucide-react'
import { motion } from 'motion/react'
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
import { useUploadImage } from '@/lib/useUploadImage'
import type { ChecklistItem, GameReference, Project } from '@/lib/types'
import {
  useCreateReference,
  useDeleteReference,
  useReferences,
  useUpdateReference,
} from '@/features/references/useReferences'

export function ReferencesPage() {
  const { project } = useOutletContext<{ project: Project }>()
  const { data: references, isLoading } = useReferences(project.id)
  const createReference = useCreateReference(project.id)
  const updateReference = useUpdateReference(project.id)
  const deleteReference = useDeleteReference(project.id)
  const { uploadMany, uploading } = useUploadImage(project.id)

  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [editing, setEditing] = useState<GameReference | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editSourceUrl, setEditSourceUrl] = useState('')
  const [editImages, setEditImages] = useState<string[]>([])
  const [editNotes, setEditNotes] = useState('')
  const [editChecklist, setEditChecklist] = useState<ChecklistItem[]>([])
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

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

      {isLoading && <p className="text-label text-sm text-canvas-fg/50">Carregando…</p>}

      {!isLoading && references?.length === 0 && (
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {references?.map((ref, i) => {
          const done = ref.checklist.filter((c) => c.done).length
          return (
            <motion.button
              key={ref.id}
              type="button"
              onClick={() => openEdit(ref)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.04 }}
              whileHover={{ x: -2, y: -2 }}
              className="cursor-pointer overflow-hidden border-2 border-line bg-surface text-left shadow-brutal-sm"
            >
              {(ref.image_urls[0] ?? ref.image_url) ? (
                <img
                  src={ref.image_urls[0] ?? ref.image_url ?? undefined}
                  alt=""
                  className="h-28 w-full border-b-2 border-line object-cover"
                />
              ) : (
                <div className="flex h-28 w-full items-center justify-center border-b-2 border-line bg-canvas text-canvas-fg/20">
                  <Upload size={22} />
                </div>
              )}
              <div className="p-3">
                <h3 className="text-display truncate text-sm">{ref.title}</h3>
                {ref.checklist.length > 0 && (
                  <p className="text-label mt-1 text-[10px] text-canvas-fg/50">
                    {done}/{ref.checklist.length} itens marcados
                  </p>
                )}
              </div>
            </motion.button>
          )
        })}
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
            </div>
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
