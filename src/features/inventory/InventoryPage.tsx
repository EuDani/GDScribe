import { useMemo, useState } from 'react'
import { LayoutGrid, Pencil, Plus, Table as TableIcon, Trash2 } from 'lucide-react'
import { clsx } from 'clsx'
import { useOutletContext } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Field, TextInput } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Tabs } from '@/components/ui/Tabs'
import { StatusBadge, StatusSelect } from '@/components/StatusSelect'
import { TagInput } from '@/components/TagInput'
import { SectorPicker, matchesSectorFilter } from '@/components/SectorPicker'
import { Badge, accentFromString } from '@/components/ui/Badge'
import { useToast } from '@/contexts/ToastContext'
import type { InventoryField, InventoryItem, InventoryType, InventoryValue, Project } from '@/lib/types'
import { FieldBuilder } from '@/features/inventory/FieldBuilder'
import { formatInventoryValue, getMissingRequiredFields, ItemForm } from '@/features/inventory/ItemForm'
import { InventoryTableView } from '@/features/inventory/InventoryTableView'
import { InventoryKanbanView } from '@/features/inventory/InventoryKanbanView'
import { useProjectSectors } from '@/features/settings/useProjectSectors'
import {
  useCreateInventoryType,
  useDeleteInventoryItem,
  useDeleteInventoryType,
  useInventoryItems,
  useInventoryTypes,
  useUpdateInventoryType,
  useUpsertInventoryItem,
} from '@/features/inventory/useInventory'

const DEFAULT_FIELDS: InventoryField[] = [{ key: 'descricao', label: 'Descrição', type: 'textarea' }]

type ViewMode = 'cards' | 'kanban' | 'table'

export function InventoryPage() {
  const { project } = useOutletContext<{ project: Project }>()
  const { data: types, isLoading: typesLoading } = useInventoryTypes(project.id)
  const createType = useCreateInventoryType(project.id)
  const updateType = useUpdateInventoryType(project.id)
  const deleteType = useDeleteInventoryType(project.id)

  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null)
  const [typeModalOpen, setTypeModalOpen] = useState(false)
  const [editingType, setEditingType] = useState<InventoryType | null>(null)
  const [typeName, setTypeName] = useState('')
  const [typeFields, setTypeFields] = useState<InventoryField[]>(DEFAULT_FIELDS)
  const [pendingDeleteType, setPendingDeleteType] = useState<string | null>(null)
  const [view, setView] = useState<ViewMode>('cards')

  const selectedType = types?.find((t) => t.id === selectedTypeId) ?? types?.[0] ?? null

  function openCreateType() {
    setEditingType(null)
    setTypeName('')
    setTypeFields(DEFAULT_FIELDS)
    setTypeModalOpen(true)
  }

  function openEditType(type: InventoryType) {
    setEditingType(type)
    setTypeName(type.name)
    setTypeFields(type.fields_schema)
    setTypeModalOpen(true)
  }

  async function handleSaveType(e: React.FormEvent) {
    e.preventDefault()
    if (!typeName.trim()) return
    const fields = typeFields.filter((f) => f.label.trim())
    if (editingType) {
      await updateType.mutateAsync({ id: editingType.id, name: typeName.trim(), fields_schema: fields })
    } else {
      const created = await createType.mutateAsync({ name: typeName.trim(), icon: 'Box', fields })
      setSelectedTypeId(created.id)
    }
    setTypeModalOpen(false)
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-display text-2xl">Inventário</h1>
        <div className="flex items-center gap-3">
          <Tabs
            items={[
              { value: 'cards', label: 'Cards' },
              { value: 'kanban', label: 'Cards (Kanban)' },
              { value: 'table', label: 'Tabela' },
            ]}
            value={view}
            onChange={setView}
          />
          <Button size="sm" icon={<Plus size={16} />} onClick={openCreateType}>
            Novo tipo
          </Button>
        </div>
      </div>

      {typesLoading && <p className="text-label text-sm text-canvas-fg/50">Carregando…</p>}

      {!typesLoading && types?.length === 0 && (
        <EmptyState
          title="Nenhum tipo de inventário"
          description="Crie um tipo (NPCs, Armas, Itens…) com os campos que fizerem sentido para o seu jogo."
          action={
            <Button icon={<Plus size={16} />} onClick={openCreateType}>
              Criar tipo
            </Button>
          }
        />
      )}

      {!typesLoading && types && types.length > 0 && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[220px_1fr]">
          <ul className="space-y-1.5">
            {types.map((type) => (
              <li key={type.id} className="group relative">
                <button
                  type="button"
                  onClick={() => setSelectedTypeId(type.id)}
                  className={clsx(
                    'w-full cursor-pointer border-2 px-3 py-2.5 text-left text-sm font-semibold transition-colors',
                    selectedType?.id === type.id
                      ? 'border-line bg-accent-yellow text-ink shadow-brutal-sm'
                      : 'border-line/40 bg-surface text-canvas-fg/80 hover:border-line',
                  )}
                >
                  {type.name}
                </button>
              </li>
            ))}
          </ul>

          {selectedType && (
            <InventoryTypePanel
              projectId={project.id}
              type={selectedType}
              view={view}
              onEditType={() => openEditType(selectedType)}
              onDeleteType={() => setPendingDeleteType(selectedType.id)}
            />
          )}
        </div>
      )}

      <Modal
        open={typeModalOpen}
        onClose={() => setTypeModalOpen(false)}
        title={editingType ? 'Editar tipo' : 'Novo tipo de inventário'}
        wide
        isDirty={
          editingType
            ? typeName !== editingType.name || JSON.stringify(typeFields) !== JSON.stringify(editingType.fields_schema)
            : Boolean(typeName.trim())
        }
      >
        <form onSubmit={handleSaveType}>
          <Field label="Nome do tipo">
            <TextInput
              required
              autoFocus
              value={typeName}
              onChange={(e) => setTypeName(e.target.value)}
              placeholder="Ex: NPCs, Armas, Inimigos"
            />
          </Field>
          <Field label="Campos" hint="Marque 'Obrigatório' para exigir preenchimento ao salvar um item">
            <FieldBuilder fields={typeFields} onChange={setTypeFields} />
          </Field>
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setTypeModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createType.isPending || updateType.isPending}>
              Salvar
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDeleteType)}
        onClose={() => setPendingDeleteType(null)}
        onConfirm={() => {
          if (pendingDeleteType) deleteType.mutate(pendingDeleteType)
          setSelectedTypeId(null)
        }}
        title="Excluir tipo"
        description="Todos os itens desse tipo serão apagados permanentemente."
        confirmLabel="Excluir"
      />
    </div>
  )
}

function InventoryTypePanel({
  projectId,
  type,
  view,
  onEditType,
  onDeleteType,
}: {
  projectId: string
  type: InventoryType
  view: ViewMode
  onEditType: () => void
  onDeleteType: () => void
}) {
  const { data: items, isLoading } = useInventoryItems(projectId, type.id)
  const upsertItem = useUpsertInventoryItem(projectId, type.id)
  const deleteItem = useDeleteInventoryItem(projectId, type.id)
  const { data: projectSectors } = useProjectSectors(projectId)
  const toast = useToast()

  const [itemModalOpen, setItemModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [values, setValues] = useState<Record<string, InventoryValue>>({})
  const [itemStatus, setItemStatus] = useState<string | null>(null)
  const [itemTags, setItemTags] = useState<string[]>([])
  const [itemSectors, setItemSectors] = useState<string[]>([])
  const [showErrors, setShowErrors] = useState(false)
  const [pendingDeleteItem, setPendingDeleteItem] = useState<string | null>(null)
  const [tagFilter, setTagFilter] = useState<string[]>([])
  const [sectorFilter, setSectorFilter] = useState<string[]>([])

  const missingFields = useMemo(
    () => getMissingRequiredFields(type.fields_schema, values),
    [type.fields_schema, values],
  )

  // Tags exclusivas do tipo: só as usadas pelos itens desse tipo específico.
  const typeTags = useMemo(
    () => Array.from(new Set((items ?? []).flatMap((i) => i.tags))).sort(),
    [items],
  )

  const filteredItems = useMemo(
    () =>
      (items ?? []).filter(
        (i) =>
          (tagFilter.length === 0 || i.tags.some((t) => tagFilter.includes(t))) &&
          matchesSectorFilter(i.sectors, sectorFilter),
      ),
    [items, tagFilter, sectorFilter],
  )

  function openCreateItem() {
    setEditingItem(null)
    setValues({})
    setItemStatus(null)
    setItemTags([])
    setItemSectors([])
    setShowErrors(false)
    setItemModalOpen(true)
  }

  function openEditItem(item: InventoryItem) {
    setEditingItem(item)
    setValues(item.data)
    setItemStatus(item.status)
    setItemTags(item.tags)
    setItemSectors(item.sectors)
    setShowErrors(false)
    setItemModalOpen(true)
  }

  async function handleSaveItem(e: React.FormEvent) {
    e.preventDefault()
    if (missingFields.length > 0) {
      setShowErrors(true)
      toast.error(`Preencha os campos obrigatórios: ${missingFields.map((f) => f.label).join(', ')}`)
      return
    }
    await upsertItem.mutateAsync({
      id: editingItem?.id,
      data: values,
      status: itemStatus,
      tags: itemTags,
      sectors: itemSectors,
    })
    setItemModalOpen(false)
  }

  return (
    <div className="min-w-0 border-2 border-line bg-surface shadow-brutal">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-line p-4">
        <h2 className="text-display flex items-center gap-2 text-lg">
          {view === 'table' ? <TableIcon size={16} /> : <LayoutGrid size={16} />}
          {type.name}
        </h2>
        <div className="flex items-center gap-2">
          <Button size="sm" icon={<Plus size={14} />} onClick={openCreateItem}>
            Novo item
          </Button>
          <button
            type="button"
            onClick={onEditType}
            aria-label="Editar tipo"
            className="cursor-pointer border-2 border-line p-1.5 text-canvas-fg/60 hover:bg-accent-blue hover:text-ink"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={onDeleteType}
            aria-label="Excluir tipo"
            className="cursor-pointer border-2 border-line p-1.5 text-canvas-fg/60 hover:bg-accent-red hover:text-canvas-fg"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="p-4">
        {(typeTags.length > 0 || (projectSectors ?? []).length > 0) && (
          <div className="mb-4 flex flex-wrap items-center gap-3">
            {typeTags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-label text-[10px] text-canvas-fg/40">Tags:</span>
                {typeTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() =>
                      setTagFilter((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
                    }
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
            )}
            {(projectSectors ?? []).length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-label text-[10px] text-canvas-fg/40">Setor:</span>
                <SectorPicker value={sectorFilter} onChange={setSectorFilter} sectors={projectSectors ?? []} />
              </div>
            )}
          </div>
        )}

        {isLoading && <p className="text-label text-sm text-canvas-fg/50">Carregando…</p>}
        {!isLoading && items?.length === 0 && (
          <EmptyState title="Nenhum item ainda" description="Adicione o primeiro item desse tipo." />
        )}
        {!isLoading && items && items.length > 0 && view === 'table' && (
          <InventoryTableView projectId={projectId} type={type} items={filteredItems} onEditItem={openEditItem} />
        )}
        {!isLoading && items && items.length > 0 && view === 'kanban' && (
          <InventoryKanbanView projectId={projectId} type={type} items={filteredItems} onItemClick={openEditItem} />
        )}
        {!isLoading && items && items.length > 0 && view === 'cards' && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((item) => {
              const primary = type.fields_schema[0]
              const title = primary ? formatInventoryValue(item.data[primary.key], primary.type) || 'Sem título' : 'Item'
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openEditItem(item)}
                  className="cursor-pointer border-2 border-line/40 bg-canvas p-3 text-left hover:border-line"
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-canvas-fg">{title}</p>
                    <StatusBadge projectId={projectId} value={item.status} />
                  </div>
                  {type.fields_schema.slice(1, 4).map((f) => (
                    <p key={f.key} className="truncate text-xs text-canvas-fg/60">
                      <span className="text-canvas-fg/40">{f.label}: </span>
                      {formatInventoryValue(item.data[f.key], f.type)}
                    </p>
                  ))}
                  {item.tags.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {item.tags.map((tag) => (
                        <Badge key={tag} accent={accentFromString(tag)}>
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <Modal
        open={itemModalOpen}
        onClose={() => setItemModalOpen(false)}
        title={editingItem ? `Editar ${type.name.replace(/s$/, '')}` : `Novo ${type.name.replace(/s$/, '')}`}
        isDirty={
          editingItem
            ? JSON.stringify(values) !== JSON.stringify(editingItem.data) ||
              itemStatus !== editingItem.status ||
              JSON.stringify(itemTags) !== JSON.stringify(editingItem.tags) ||
              JSON.stringify(itemSectors) !== JSON.stringify(editingItem.sectors)
            : Object.values(values).some((v) => v !== null && v !== '') || itemStatus !== null
        }
      >
        <form onSubmit={handleSaveItem}>
          <ItemForm
            fields={type.fields_schema}
            values={values}
            onChange={setValues}
            showErrors={showErrors}
            projectId={projectId}
          />
          <Field label="Status">
            <StatusSelect projectId={projectId} value={itemStatus} onChange={setItemStatus} />
          </Field>
          <Field label="Tags" hint={`Exclusivas do tipo "${type.name}"`}>
            <TagInput value={itemTags} onChange={setItemTags} suggestions={typeTags} placeholder="raro, chefe, quebrável…" />
          </Field>
          <Field label="Setores" hint="Opcional">
            <SectorPicker value={itemSectors} onChange={setItemSectors} sectors={projectSectors ?? []} />
          </Field>
          <div className="mt-2 flex justify-between gap-2">
            {editingItem && (
              <Button type="button" variant="danger" onClick={() => setPendingDeleteItem(editingItem.id)}>
                Excluir
              </Button>
            )}
            <div className={clsx('flex gap-2', !editingItem && 'ml-auto')}>
              <Button type="button" variant="ghost" onClick={() => setItemModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={upsertItem.isPending}>
                Salvar
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDeleteItem)}
        onClose={() => setPendingDeleteItem(null)}
        onConfirm={() => {
          if (pendingDeleteItem) deleteItem.mutate(pendingDeleteItem)
          setItemModalOpen(false)
        }}
        title="Excluir item"
        description="Essa ação não pode ser desfeita."
        confirmLabel="Excluir"
      />
    </div>
  )
}
