import { useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { Pencil, Plus, Trash2, Upload } from 'lucide-react'
import { clsx } from 'clsx'
import { useOutletContext } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Field, TextInput, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { ChecklistEditor } from '@/components/ChecklistEditor'
import { IconPicker } from '@/components/IconPicker'
import { TagInput } from '@/components/TagInput'
import { SectorPicker, matchesSectorFilter } from '@/components/SectorPicker'
import { ExtraFieldsEditor } from '@/features/gdd/ExtraFieldsEditor'
import { useUploadImage } from '@/lib/useUploadImage'
import type { ChecklistItem, ExtraField, KanbanCard, Project } from '@/lib/types'
import { KanbanColumnView } from '@/features/kanban/KanbanColumn'
import { KanbanCardFace } from '@/features/kanban/KanbanCard'
import { useProjectSectors } from '@/features/settings/useProjectSectors'
import {
  useCreateBoard,
  useCreateCard,
  useCreateColumn,
  useDeleteBoard,
  useDeleteCard,
  useDeleteColumn,
  useKanbanBoards,
  useKanbanCards,
  useKanbanColumns,
  useMoveCards,
  useRenameBoard,
  useReorderColumns,
  useUpdateCard,
  useUpdateColumn,
} from '@/features/kanban/useKanban'

const COLUMN_COLORS = [
  'var(--color-accent-blue)',
  'var(--color-accent-yellow)',
  'var(--color-accent-green)',
  'var(--color-accent-red)',
  'var(--color-accent-purple)',
]

export function KanbanPage() {
  const { project } = useOutletContext<{ project: Project }>()
  const { data: boards, isLoading: boardsLoading } = useKanbanBoards(project.id)
  const createBoard = useCreateBoard(project.id)
  const renameBoard = useRenameBoard(project.id)
  const deleteBoard = useDeleteBoard(project.id)

  const [activeBoardId, setActiveBoardId] = useState<string | null>(null)
  const activeBoard = boards?.find((b) => b.id === activeBoardId) ?? boards?.[0] ?? null

  const [boardModalOpen, setBoardModalOpen] = useState(false)
  const [editingBoardId, setEditingBoardId] = useState<string | null>(null)
  const [boardName, setBoardName] = useState('')
  const [pendingDeleteBoard, setPendingDeleteBoard] = useState<string | null>(null)

  function openCreateBoard() {
    setEditingBoardId(null)
    setBoardName('')
    setBoardModalOpen(true)
  }

  function openRenameBoard(id: string, name: string) {
    setEditingBoardId(id)
    setBoardName(name)
    setBoardModalOpen(true)
  }

  async function handleSaveBoard(e: React.FormEvent) {
    e.preventDefault()
    if (!boardName.trim()) return
    if (editingBoardId) await renameBoard.mutateAsync({ id: editingBoardId, name: boardName.trim() })
    else {
      const created = await createBoard.mutateAsync(boardName.trim())
      setActiveBoardId(created.id)
    }
    setBoardModalOpen(false)
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-display text-2xl">Kanban</h1>
      </div>

      {boardsLoading && <p className="text-label text-sm text-canvas-fg/50">Carregando…</p>}

      <div className="mb-6 flex flex-wrap items-center gap-1.5">
        {boards?.map((board) => (
          <div key={board.id} className="group flex items-center">
            <button
              type="button"
              onClick={() => setActiveBoardId(board.id)}
              className={clsx(
                'text-label cursor-pointer border-2 px-3 py-1.5 text-xs font-semibold',
                activeBoard?.id === board.id
                  ? 'border-line bg-accent-yellow text-ink shadow-brutal-sm'
                  : 'border-line/40 bg-surface text-canvas-fg/70 hover:border-line',
              )}
            >
              {board.name}
            </button>
            <button
              type="button"
              onClick={() => openRenameBoard(board.id, board.name)}
              aria-label="Renomear quadro"
              className="ml-0.5 cursor-pointer p-1 text-canvas-fg/30 opacity-0 group-hover:opacity-100 hover:text-canvas-fg"
            >
              <Pencil size={11} />
            </button>
            {boards.length > 1 && (
              <button
                type="button"
                onClick={() => setPendingDeleteBoard(board.id)}
                aria-label="Excluir quadro"
                className="cursor-pointer p-1 text-canvas-fg/30 opacity-0 group-hover:opacity-100 hover:text-accent-red"
              >
                <Trash2 size={11} />
              </button>
            )}
          </div>
        ))}
        <Button size="sm" variant="ghost" icon={<Plus size={13} />} onClick={openCreateBoard}>
          Novo quadro
        </Button>
      </div>

      {activeBoard && <KanbanBoardView key={activeBoard.id} projectId={project.id} boardId={activeBoard.id} />}

      <Modal
        open={boardModalOpen}
        onClose={() => setBoardModalOpen(false)}
        title={editingBoardId ? 'Renomear quadro' : 'Novo quadro'}
        isDirty={editingBoardId ? boardName !== boards?.find((b) => b.id === editingBoardId)?.name : Boolean(boardName.trim())}
      >
        <form onSubmit={handleSaveBoard}>
          <Field label="Nome do quadro" hint="Ex: Ações, MoSCoW, Sprint 3…">
            <TextInput required autoFocus value={boardName} onChange={(e) => setBoardName(e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setBoardModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Salvar</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDeleteBoard)}
        onClose={() => setPendingDeleteBoard(null)}
        onConfirm={() => {
          if (pendingDeleteBoard) deleteBoard.mutate(pendingDeleteBoard)
          setActiveBoardId(null)
        }}
        title="Excluir quadro"
        description="Todas as colunas e cards desse quadro serão apagados junto."
        confirmLabel="Excluir"
      />
    </div>
  )
}

function KanbanBoardView({ projectId, boardId }: { projectId: string; boardId: string }) {
  const { data: columns, isLoading: columnsLoading } = useKanbanColumns(projectId, boardId)
  const { data: cards } = useKanbanCards(projectId, boardId)
  const createColumn = useCreateColumn(projectId, boardId)
  const updateColumn = useUpdateColumn(projectId, boardId)
  const deleteColumn = useDeleteColumn(projectId, boardId)
  const createCard = useCreateCard(projectId, boardId)
  const updateCard = useUpdateCard(projectId, boardId)
  const deleteCard = useDeleteCard(projectId, boardId)
  const moveCards = useMoveCards(projectId, boardId)
  const reorderColumns = useReorderColumns(projectId, boardId)
  const { data: sectors } = useProjectSectors(projectId)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const [activeCard, setActiveCard] = useState<KanbanCard | null>(null)
  const [tagFilter, setTagFilter] = useState<Set<string>>(new Set())
  const [sectorFilter, setSectorFilter] = useState<string[]>([])

  const [columnModalOpen, setColumnModalOpen] = useState(false)
  const [columnName, setColumnName] = useState('')
  const [pendingDeleteColumn, setPendingDeleteColumn] = useState<string | null>(null)

  const [cardModalColumnId, setCardModalColumnId] = useState<string | null>(null)
  const [cardTitle, setCardTitle] = useState('')
  const [cardDescription, setCardDescription] = useState('')

  const [editingCard, setEditingCard] = useState<KanbanCard | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editTags, setEditTags] = useState<string[]>([])
  const [editIcon, setEditIcon] = useState<string | null>(null)
  const [editCover, setEditCover] = useState<string | null>(null)
  const [editChecklist, setEditChecklist] = useState<ChecklistItem[]>([])
  const [editExtraFields, setEditExtraFields] = useState<ExtraField[]>([])
  const [editStartDate, setEditStartDate] = useState('')
  const [editDueDate, setEditDueDate] = useState('')
  const [editSectors, setEditSectors] = useState<string[]>([])
  const [pendingDeleteCard, setPendingDeleteCard] = useState<string | null>(null)

  const { upload: uploadCover, uploading: uploadingCover } = useUploadImage(projectId)

  const allTags = useMemo(() => Array.from(new Set((cards ?? []).flatMap((c) => c.tags))).sort(), [cards])

  function cardsFor(columnId: string) {
    return (cards ?? [])
      .filter((c) => c.column_id === columnId)
      .filter((c) => tagFilter.size === 0 || c.tags.some((t) => tagFilter.has(t)))
      .filter((c) => matchesSectorFilter(c.sectors, sectorFilter))
      .sort((a, b) => a.sort_order - b.sort_order)
  }

  function toggleTag(tag: string) {
    setTagFilter((prev) => {
      const next = new Set(prev)
      if (next.has(tag)) next.delete(tag)
      else next.add(tag)
      return next
    })
  }

  async function handleCreateColumn(e: React.FormEvent) {
    e.preventDefault()
    if (!columnName.trim()) return
    const color = COLUMN_COLORS[(columns?.length ?? 0) % COLUMN_COLORS.length]
    await createColumn.mutateAsync({ name: columnName.trim(), color })
    setColumnName('')
    setColumnModalOpen(false)
  }

  async function handleCreateCard(e: React.FormEvent) {
    e.preventDefault()
    if (!cardModalColumnId || !cardTitle.trim()) return
    await createCard.mutateAsync({
      columnId: cardModalColumnId,
      title: cardTitle.trim(),
      description: cardDescription.trim(),
    })
    setCardTitle('')
    setCardDescription('')
    setCardModalColumnId(null)
  }

  function openEditCard(card: KanbanCard) {
    setEditingCard(card)
    setEditTitle(card.title)
    setEditDescription(card.description ?? '')
    setEditTags(card.tags)
    setEditIcon(card.icon)
    setEditCover(card.cover_image_url)
    setEditChecklist(card.checklist)
    setEditExtraFields(card.extra_fields)
    setEditStartDate(card.start_date ?? '')
    setEditDueDate(card.due_date ?? '')
    setEditSectors(card.sectors)
  }

  async function handleSaveCard(e: React.FormEvent) {
    e.preventDefault()
    if (!editingCard) return
    await updateCard.mutateAsync({
      id: editingCard.id,
      title: editTitle.trim(),
      description: editDescription.trim() || null,
      tags: editTags,
      icon: editIcon,
      cover_image_url: editCover,
      checklist: editChecklist,
      extra_fields: editExtraFields,
      start_date: editStartDate || null,
      due_date: editDueDate || null,
      sectors: editSectors,
    })
    setEditingCard(null)
  }

  function moveColumn(index: number, dir: -1 | 1) {
    if (!columns) return
    const target = index + dir
    if (target < 0 || target >= columns.length) return
    const reordered = [...columns]
    const [item] = reordered.splice(index, 1)
    reordered.splice(target, 0, item)
    reorderColumns.mutate(reordered.map((c, i) => ({ id: c.id, sort_order: i })))
  }

  async function handleCoverUpload(file: File) {
    const url = await uploadCover(file, 'kanban-covers')
    if (url) setEditCover(url)
  }

  function handleDragStart(event: DragStartEvent) {
    const card = (cards ?? []).find((c) => c.id === event.active.id)
    setActiveCard(card ?? null)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveCard(null)
    const { active, over } = event
    if (!over || !cards) return

    const activeCard = cards.find((c) => c.id === active.id)
    if (!activeCard) return

    const overIsColumn = over.data.current?.type === 'column'
    const targetColumnId = overIsColumn ? (over.id as string) : (over.data.current?.columnId as string)
    if (!targetColumnId) return

    const sourceColumnId = activeCard.column_id
    const sourceList = cardsFor(sourceColumnId).filter((c) => c.id !== activeCard.id)
    const targetList =
      sourceColumnId === targetColumnId ? sourceList : cardsFor(targetColumnId).filter((c) => c.id !== activeCard.id)

    let insertIndex = targetList.length
    if (!overIsColumn) {
      const overIndex = targetList.findIndex((c) => c.id === over.id)
      if (overIndex >= 0) insertIndex = overIndex
    }
    targetList.splice(insertIndex, 0, activeCard)

    const updates = [
      ...targetList.map((c, i) => ({ id: c.id, column_id: targetColumnId, sort_order: i })),
      ...(sourceColumnId !== targetColumnId
        ? sourceList.map((c, i) => ({ id: c.id, column_id: sourceColumnId, sort_order: i }))
        : []),
    ]

    moveCards.mutate(updates)
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {allTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-label text-[10px] text-canvas-fg/40">Tags:</span>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={clsx(
                    'text-label border-2 border-line px-1.5 py-0.5 text-[10px]',
                    tagFilter.has(tag) ? 'bg-accent-blue text-ink' : 'bg-transparent text-canvas-fg/50 hover:text-canvas-fg',
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
          {(sectors ?? []).length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-label text-[10px] text-canvas-fg/40">Setor:</span>
              <SectorPicker value={sectorFilter} onChange={setSectorFilter} sectors={sectors ?? []} />
            </div>
          )}
          {(tagFilter.size > 0 || sectorFilter.length > 0) && (
            <button
              type="button"
              onClick={() => {
                setTagFilter(new Set())
                setSectorFilter([])
              }}
              className="text-label text-[10px] text-canvas-fg/40 underline"
            >
              limpar
            </button>
          )}
        </div>
        <Button size="sm" icon={<Plus size={16} />} onClick={() => setColumnModalOpen(true)}>
          Nova coluna
        </Button>
      </div>

      {columnsLoading && <p className="text-label text-sm text-canvas-fg/50">Carregando…</p>}

      {!columnsLoading && columns?.length === 0 && (
        <EmptyState title="Nenhuma coluna ainda" description="Crie a primeira coluna desse quadro." />
      )}

      {!columnsLoading && columns && columns.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {columns.map((column, i) => (
              <KanbanColumnView
                key={column.id}
                column={column}
                cards={cardsFor(column.id)}
                onAddCard={() => setCardModalColumnId(column.id)}
                onDeleteColumn={() => setPendingDeleteColumn(column.id)}
                onRenameColumn={(name) => updateColumn.mutate({ id: column.id, name })}
                onCardClick={openEditCard}
                onMoveLeft={() => moveColumn(i, -1)}
                onMoveRight={() => moveColumn(i, 1)}
                canMoveLeft={i > 0}
                canMoveRight={i < columns.length - 1}
              />
            ))}
          </div>
          <DragOverlay>
            {activeCard && (
              <div className="w-72 rotate-2 overflow-hidden border-2 border-line bg-paper text-ink shadow-brutal-lg">
                <KanbanCardFace card={activeCard} />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      <Modal
        open={columnModalOpen}
        onClose={() => setColumnModalOpen(false)}
        title="Nova coluna"
        isDirty={Boolean(columnName.trim())}
      >
        <form onSubmit={handleCreateColumn}>
          <Field label="Nome">
            <TextInput
              required
              autoFocus
              value={columnName}
              onChange={(e) => setColumnName(e.target.value)}
              placeholder="Ex: Must have, Should have…"
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setColumnModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Criar</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(cardModalColumnId)}
        onClose={() => setCardModalColumnId(null)}
        title="Novo card"
        isDirty={Boolean(cardTitle.trim() || cardDescription.trim())}
      >
        <form onSubmit={handleCreateCard}>
          <Field label="Título">
            <TextInput required autoFocus value={cardTitle} onChange={(e) => setCardTitle(e.target.value)} />
          </Field>
          <Field label="Descrição" hint="Opcional">
            <Textarea rows={3} value={cardDescription} onChange={(e) => setCardDescription(e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setCardModalColumnId(null)}>
              Cancelar
            </Button>
            <Button type="submit">Criar</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(editingCard)}
        onClose={() => setEditingCard(null)}
        title="Editar card"
        wide
        isDirty={Boolean(
          editingCard &&
            (editTitle !== editingCard.title ||
              editDescription !== (editingCard.description ?? '') ||
              JSON.stringify(editTags) !== JSON.stringify(editingCard.tags) ||
              editIcon !== editingCard.icon ||
              editCover !== editingCard.cover_image_url ||
              JSON.stringify(editChecklist) !== JSON.stringify(editingCard.checklist) ||
              JSON.stringify(editExtraFields) !== JSON.stringify(editingCard.extra_fields) ||
              editStartDate !== (editingCard.start_date ?? '') ||
              editDueDate !== (editingCard.due_date ?? '') ||
              JSON.stringify(editSectors) !== JSON.stringify(editingCard.sectors)),
        )}
      >
        <form onSubmit={handleSaveCard}>
          <Field label="Título">
            <TextInput required value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
          </Field>
          <Field label="Descrição">
            <Textarea rows={3} value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
          </Field>

          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Início">
              <TextInput type="date" value={editStartDate} onChange={(e) => setEditStartDate(e.target.value)} />
            </Field>
            <Field label="Conclusão">
              <TextInput type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} />
            </Field>
          </div>

          <Field label="Tags">
            <TagInput value={editTags} onChange={setEditTags} suggestions={allTags} placeholder="urgente, arte, bug…" />
          </Field>

          <Field label="Setores">
            <SectorPicker value={editSectors} onChange={setEditSectors} sectors={sectors ?? []} />
          </Field>

          <Field label="Ícone">
            <IconPicker value={editIcon} onChange={setEditIcon} />
          </Field>

          <Field label="Capa">
            <div className="flex items-center gap-3">
              {editCover && (
                <img src={editCover} alt="" className="h-14 w-24 border-2 border-line object-cover" />
              )}
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleCoverUpload(file)
                    e.target.value = ''
                  }}
                />
                <span className="text-label inline-flex cursor-pointer items-center gap-1.5 border-2 border-line px-2.5 py-1.5 text-[11px] text-canvas-fg/70 hover:bg-accent-blue hover:text-ink">
                  <Upload size={12} />
                  {uploadingCover ? 'Enviando…' : 'Trocar capa'}
                </span>
              </label>
              {editCover && (
                <button
                  type="button"
                  onClick={() => setEditCover(null)}
                  className="text-label text-[11px] text-canvas-fg/40 underline hover:text-canvas-fg"
                >
                  remover
                </button>
              )}
            </div>
          </Field>

          <Field label="Checklist">
            <ChecklistEditor items={editChecklist} onChange={setEditChecklist} />
          </Field>

          <Field label="Campos customizados">
            <ExtraFieldsEditor fields={editExtraFields} onChange={setEditExtraFields} />
          </Field>

          <div className="mt-4 flex justify-between gap-2">
            <Button
              type="button"
              variant="danger"
              onClick={() => {
                if (editingCard) setPendingDeleteCard(editingCard.id)
              }}
            >
              Excluir
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setEditingCard(null)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar</Button>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDeleteColumn)}
        onClose={() => setPendingDeleteColumn(null)}
        onConfirm={() => pendingDeleteColumn && deleteColumn.mutate(pendingDeleteColumn)}
        title="Excluir coluna"
        description="Os cards dessa coluna serão apagados junto."
        confirmLabel="Excluir"
      />

      <ConfirmDialog
        open={Boolean(pendingDeleteCard)}
        onClose={() => setPendingDeleteCard(null)}
        onConfirm={() => {
          if (pendingDeleteCard) deleteCard.mutate(pendingDeleteCard)
          setEditingCard(null)
        }}
        title="Excluir card"
        description="Essa ação não pode ser desfeita."
        confirmLabel="Excluir"
      />
    </div>
  )
}
