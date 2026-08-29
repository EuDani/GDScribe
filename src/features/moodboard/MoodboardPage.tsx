import { useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Folder, FolderPlus, Images, Pencil, Plus, Trash2, Upload } from 'lucide-react'
import { motion } from 'motion/react'
import { clsx } from 'clsx'
import { useOutletContext } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Field, Select, TextInput } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { ImageLightbox } from '@/components/ImageLightbox'
import { useUploadImage } from '@/lib/useUploadImage'
import type { MoodboardFolder, MoodboardImage, Project } from '@/lib/types'
import {
  useAddMoodboardImages,
  useCreateMoodboardFolder,
  useDeleteMoodboardFolder,
  useDeleteMoodboardImage,
  useMoodboardFolders,
  useMoodboardImages,
  useMoveMoodboardFolder,
  useRenameMoodboardFolder,
  useReorderMoodboardFolders,
  useReorderMoodboardImages,
  useUpdateMoodboardImage,
} from '@/features/moodboard/useMoodboard'

const ALL = 'all'
const UNSORTED = 'unsorted'

export function MoodboardPage() {
  const { project } = useOutletContext<{ project: Project }>()
  const { data: folders, isLoading: foldersLoading } = useMoodboardFolders(project.id)
  const { data: images, isLoading: imagesLoading } = useMoodboardImages(project.id)
  const createFolder = useCreateMoodboardFolder(project.id)
  const renameFolder = useRenameMoodboardFolder(project.id)
  const deleteFolder = useDeleteMoodboardFolder(project.id)
  const reorderFolders = useReorderMoodboardFolders(project.id)
  const moveFolderMutation = useMoveMoodboardFolder(project.id)
  const addImages = useAddMoodboardImages(project.id)
  const updateImage = useUpdateMoodboardImage(project.id)
  const deleteImage = useDeleteMoodboardImage(project.id)
  const reorderImages = useReorderMoodboardImages(project.id)
  const { uploadMany, uploading } = useUploadImage(project.id)

  const [activeFolder, setActiveFolder] = useState<string>(ALL)
  const [folderModalOpen, setFolderModalOpen] = useState(false)
  const [editingFolder, setEditingFolder] = useState<MoodboardFolder | null>(null)
  const [creatingParentId, setCreatingParentId] = useState<string | null>(null)
  const [folderName, setFolderName] = useState('')
  const [editParentId, setEditParentId] = useState<string | null>(null)
  const [pendingDeleteFolder, setPendingDeleteFolder] = useState<string | null>(null)
  const [pendingDeleteImage, setPendingDeleteImage] = useState<string | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const topFolders = useMemo(() => (folders ?? []).filter((f) => !f.parent_id), [folders])
  const childrenByParent = useMemo(() => {
    const map = new Map<string, MoodboardFolder[]>()
    for (const f of folders ?? []) {
      if (!f.parent_id) continue
      const list = map.get(f.parent_id) ?? []
      list.push(f)
      map.set(f.parent_id, list)
    }
    return map
  }, [folders])

  const visibleImages = useMemo(() => {
    if (!images) return []
    if (activeFolder === ALL) return images
    if (activeFolder === UNSORTED) return images.filter((i) => !i.folder_id)
    return images.filter((i) => i.folder_id === activeFolder)
  }, [images, activeFolder])

  const countFor = (folderId: string | null) => (images ?? []).filter((i) => i.folder_id === folderId).length

  function openCreateFolder(parentId: string | null) {
    setEditingFolder(null)
    setCreatingParentId(parentId)
    setFolderName('')
    setFolderModalOpen(true)
  }

  function openRenameFolder(folder: MoodboardFolder) {
    setEditingFolder(folder)
    setFolderName(folder.name)
    setEditParentId(folder.parent_id)
    setFolderModalOpen(true)
  }

  function descendantIds(folderId: string): Set<string> {
    const ids = new Set<string>()
    const stack = [folderId]
    while (stack.length > 0) {
      const current = stack.pop()!
      for (const f of childrenByParent.get(current) ?? []) {
        ids.add(f.id)
        stack.push(f.id)
      }
    }
    return ids
  }

  async function handleSaveFolder(e: React.FormEvent) {
    e.preventDefault()
    if (!folderName.trim()) return
    if (editingFolder) {
      await renameFolder.mutateAsync({ id: editingFolder.id, name: folderName.trim() })
      if (editParentId !== editingFolder.parent_id) {
        await moveFolderMutation.mutateAsync({ id: editingFolder.id, parentId: editParentId })
      }
    } else {
      const created = await createFolder.mutateAsync({ name: folderName.trim(), parentId: creatingParentId })
      setActiveFolder(created.id)
    }
    setFolderModalOpen(false)
  }

  function moveFolder(group: MoodboardFolder[], index: number, dir: -1 | 1) {
    const target = index + dir
    if (target < 0 || target >= group.length) return
    const reordered = [...group]
    const [item] = reordered.splice(index, 1)
    reordered.splice(target, 0, item)
    reorderFolders.mutate(reordered.map((f, i) => ({ id: f.id, sort_order: i })))
  }

  async function handleFiles(files: FileList | File[] | null) {
    if (!files || files.length === 0) return
    const folderId = activeFolder === ALL || activeFolder === UNSORTED ? null : activeFolder
    const urls = await uploadMany(Array.from(files), 'moodboard')
    if (urls.length > 0) await addImages.mutateAsync({ urls, folderId })
  }

  async function handlePasteImage(e: React.ClipboardEvent) {
    const files = Array.from(e.clipboardData?.items ?? [])
      .filter((item) => item.type.startsWith('image/'))
      .map((item) => item.getAsFile())
      .filter((f): f is File => f !== null)
    if (files.length === 0) return
    e.preventDefault()
    await handleFiles(files)
  }

  function moveImage(index: number, dir: -1 | 1) {
    const target = index + dir
    if (target < 0 || target >= visibleImages.length) return
    const a = visibleImages[index]
    const b = visibleImages[target]
    reorderImages.mutate([
      { id: a.id, sort_order: b.sort_order },
      { id: b.id, sort_order: a.sort_order },
    ])
  }

  function FolderRow({ folder, group, index }: { folder: MoodboardFolder; group: MoodboardFolder[]; index: number }) {
    return (
      <div className="group flex items-center gap-0.5">
        <div className="flex shrink-0 flex-col">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => moveFolder(group, index, -1)}
            aria-label="Mover para cima"
            className="cursor-pointer text-canvas-fg/30 opacity-0 hover:text-canvas-fg group-hover:opacity-100 disabled:opacity-0"
          >
            <ArrowUp size={9} />
          </button>
          <button
            type="button"
            disabled={index === group.length - 1}
            onClick={() => moveFolder(group, index, 1)}
            aria-label="Mover para baixo"
            className="cursor-pointer text-canvas-fg/30 opacity-0 hover:text-canvas-fg group-hover:opacity-100 disabled:opacity-0"
          >
            <ArrowDown size={9} />
          </button>
        </div>
        <button
          type="button"
          onClick={() => setActiveFolder(folder.id)}
          className={clsx(
            'flex min-w-0 flex-1 cursor-pointer items-center gap-2 border-2 px-2.5 py-2 text-left text-xs font-semibold',
            activeFolder === folder.id
              ? 'border-line bg-accent-yellow text-ink'
              : 'border-line/40 bg-surface text-canvas-fg/80 hover:border-line',
          )}
        >
          <Folder size={14} className="shrink-0" />
          <span className="truncate">{folder.name}</span>
          <span className="ml-auto shrink-0 text-canvas-fg/40">{countFor(folder.id)}</span>
        </button>
        <button
          type="button"
          onClick={() => openCreateFolder(folder.id)}
          aria-label="Nova subpasta"
          title="Nova subpasta"
          className="shrink-0 cursor-pointer border-2 border-line/40 p-1.5 text-canvas-fg/40 opacity-0 group-hover:opacity-100 hover:border-line hover:text-canvas-fg"
        >
          <Plus size={11} />
        </button>
        <button
          type="button"
          onClick={() => openRenameFolder(folder)}
          aria-label="Renomear pasta"
          className="shrink-0 cursor-pointer border-2 border-line/40 p-1.5 text-canvas-fg/40 opacity-0 group-hover:opacity-100 hover:border-line hover:text-canvas-fg"
        >
          <Pencil size={11} />
        </button>
        <button
          type="button"
          onClick={() => setPendingDeleteFolder(folder.id)}
          aria-label="Excluir pasta"
          className="shrink-0 cursor-pointer border-2 border-line/40 p-1.5 text-canvas-fg/40 opacity-0 group-hover:opacity-100 hover:border-accent-red hover:text-accent-red"
        >
          <Trash2 size={11} />
        </button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[240px_1fr]">
      <aside className="space-y-1.5">
        <div className="mb-2 flex items-center justify-between">
          <h1 className="text-display text-xl">Moodboard</h1>
          <button
            type="button"
            onClick={() => openCreateFolder(null)}
            aria-label="Nova pasta"
            title="Nova pasta"
            className="cursor-pointer border-2 border-line p-1.5 text-canvas-fg/60 hover:bg-accent-yellow hover:text-ink"
          >
            <FolderPlus size={14} />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setActiveFolder(ALL)}
          className={clsx(
            'flex w-full cursor-pointer items-center gap-2 border-2 px-2.5 py-2 text-left text-xs font-semibold',
            activeFolder === ALL
              ? 'border-line bg-accent-yellow text-ink'
              : 'border-line/40 bg-surface text-canvas-fg/80 hover:border-line',
          )}
        >
          <Images size={14} />
          Todas
          <span className="ml-auto text-canvas-fg/40">{images?.length ?? 0}</span>
        </button>

        {foldersLoading && <p className="text-label px-2 text-xs text-canvas-fg/40">Carregando…</p>}

        {topFolders.map((folder, i) => (
          <div key={folder.id}>
            <FolderRow folder={folder} group={topFolders} index={i} />
            {(childrenByParent.get(folder.id) ?? []).length > 0 && (
              <div className="mt-1 ml-4 space-y-1 border-l-2 border-line/30 pl-1.5">
                {(childrenByParent.get(folder.id) ?? []).map((child, ci) => (
                  <FolderRow key={child.id} folder={child} group={childrenByParent.get(folder.id) ?? []} index={ci} />
                ))}
              </div>
            )}
          </div>
        ))}

        <button
          type="button"
          onClick={() => setActiveFolder(UNSORTED)}
          className={clsx(
            'flex w-full cursor-pointer items-center gap-2 border-2 px-2.5 py-2 text-left text-xs font-semibold',
            activeFolder === UNSORTED
              ? 'border-line bg-accent-yellow text-ink'
              : 'border-line/40 bg-surface text-canvas-fg/60 hover:border-line',
          )}
        >
          <Folder size={14} className="opacity-50" />
          Sem pasta
          <span className="ml-auto text-canvas-fg/40">{countFor(null)}</span>
        </button>
      </aside>

      <div className="min-w-0" tabIndex={-1} onPaste={handlePasteImage}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-label text-xs text-canvas-fg/50">
            {visibleImages.length} imagem(ns) — clique numa imagem pra focar, cole com Ctrl+V pra adicionar
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              handleFiles(e.target.files)
              e.target.value = ''
            }}
          />
          <Button
            size="sm"
            icon={<Upload size={14} />}
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? 'Enviando…' : 'Enviar imagens'}
          </Button>
        </div>

        {imagesLoading && <p className="text-label text-sm text-canvas-fg/50">Carregando…</p>}

        {!imagesLoading && visibleImages.length === 0 && (
          <EmptyState
            title="Nenhuma imagem aqui"
            description="Envie fotos, prints e referências visuais para o seu jogo — pode selecionar várias de uma vez."
            action={
              <Button icon={<Plus size={14} />} onClick={() => fileInputRef.current?.click()}>
                Enviar imagens
              </Button>
            }
          />
        )}

        {!imagesLoading && visibleImages.length > 0 && (
          <div className="columns-2 gap-3 sm:columns-3 xl:columns-4">
            {visibleImages.map((image, i) => (
              <MoodboardImageCard
                key={image.id}
                image={image}
                index={i}
                canMoveLeft={i > 0}
                canMoveRight={i < visibleImages.length - 1}
                onCaptionChange={(caption) => updateImage.mutate({ id: image.id, caption })}
                onDelete={() => setPendingDeleteImage(image.id)}
                onOpen={() => setLightboxIndex(i)}
                onMoveLeft={() => moveImage(i, -1)}
                onMoveRight={() => moveImage(i, 1)}
              />
            ))}
          </div>
        )}
      </div>

      <Modal
        open={folderModalOpen}
        onClose={() => setFolderModalOpen(false)}
        title={editingFolder ? 'Renomear pasta' : creatingParentId ? 'Nova subpasta' : 'Nova pasta'}
        isDirty={
          editingFolder
            ? folderName !== editingFolder.name || editParentId !== editingFolder.parent_id
            : Boolean(folderName.trim())
        }
      >
        <form onSubmit={handleSaveFolder}>
          <Field label="Nome da pasta">
            <TextInput
              required
              autoFocus
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="Ex: Paleta de cores, Personagens…"
            />
          </Field>
          {editingFolder && (
            <Field label="Pasta pai" hint="Mova essa pasta para dentro de outra, ou deixe na raiz">
              <Select
                value={editParentId ?? ''}
                onChange={(e) => setEditParentId(e.target.value || null)}
              >
                <option value="">— (raiz)</option>
                {(folders ?? [])
                  .filter((f) => f.id !== editingFolder.id && !descendantIds(editingFolder.id).has(f.id))
                  .map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
              </Select>
            </Field>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setFolderModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Salvar</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDeleteFolder)}
        onClose={() => setPendingDeleteFolder(null)}
        onConfirm={() => {
          if (pendingDeleteFolder) deleteFolder.mutate(pendingDeleteFolder)
          setActiveFolder(ALL)
        }}
        title="Excluir pasta"
        description="As imagens e subpastas dessa pasta serão apagadas junto."
        confirmLabel="Excluir"
      />

      <ConfirmDialog
        open={Boolean(pendingDeleteImage)}
        onClose={() => setPendingDeleteImage(null)}
        onConfirm={() => pendingDeleteImage && deleteImage.mutate(pendingDeleteImage)}
        title="Excluir imagem"
        description="Essa ação não pode ser desfeita."
        confirmLabel="Excluir"
      />

      <ImageLightbox
        images={visibleImages.map((i) => i.image_url)}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onIndexChange={setLightboxIndex}
      />
    </div>
  )
}

function MoodboardImageCard({
  image,
  index,
  canMoveLeft,
  canMoveRight,
  onCaptionChange,
  onDelete,
  onOpen,
  onMoveLeft,
  onMoveRight,
}: {
  image: MoodboardImage
  index: number
  canMoveLeft: boolean
  canMoveRight: boolean
  onCaptionChange: (caption: string) => void
  onDelete: () => void
  onOpen: () => void
  onMoveLeft: () => void
  onMoveRight: () => void
}) {
  const [caption, setCaption] = useState(image.caption ?? '')

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index, 10) * 0.03 }}
      className="group relative mb-3 break-inside-avoid border-2 border-line bg-surface"
    >
      <button type="button" onClick={onOpen} className="block w-full cursor-pointer" aria-label="Ver imagem em foco">
        <img src={image.image_url} alt={image.caption ?? ''} className="w-full object-cover" />
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label="Excluir imagem"
        className="absolute right-1.5 top-1.5 cursor-pointer border-2 border-line bg-accent-red p-1 text-canvas-fg opacity-0 transition-opacity group-hover:opacity-100"
      >
        <Trash2 size={12} />
      </button>
      <div className="absolute left-1.5 top-1.5 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          disabled={!canMoveLeft}
          onClick={onMoveLeft}
          aria-label="Mover imagem para trás"
          className="cursor-pointer border-2 border-line bg-paper p-1 text-ink disabled:opacity-30"
        >
          <ArrowLeft size={12} />
        </button>
        <button
          type="button"
          disabled={!canMoveRight}
          onClick={onMoveRight}
          aria-label="Mover imagem para frente"
          className="cursor-pointer border-2 border-line bg-paper p-1 text-ink disabled:opacity-30"
        >
          <ArrowRight size={12} />
        </button>
      </div>
      <input
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        onBlur={() => caption !== (image.caption ?? '') && onCaptionChange(caption)}
        placeholder="Legenda…"
        className="w-full border-t-2 border-line bg-transparent px-2 py-1.5 text-xs text-canvas-fg placeholder:text-canvas-fg/30 focus:outline-none"
      />
    </motion.div>
  )
}
