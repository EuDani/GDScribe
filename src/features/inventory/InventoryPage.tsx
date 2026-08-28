import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { clsx } from 'clsx'
import { useOutletContext } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Field, TextInput } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import type { InventoryField, InventoryItem, InventoryType, Project } from '@/lib/types'
import { FieldBuilder } from '@/features/inventory/FieldBuilder'
import { ItemForm } from '@/features/inventory/ItemForm'
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
        <Button size="sm" icon={<Plus size={16} />} onClick={openCreateType}>
          Novo tipo
        </Button>
      </div>

      {typesLoading && <p className="text-label text-sm text-paper/50">Carregando…</p>}

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
                      ? 'border-ink bg-accent-yellow text-ink shadow-brutal-sm'
                      : 'border-ink/40 bg-ink-soft text-paper/80 hover:border-ink',
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
          <Field label="Campos">
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
  onEditType,
  onDeleteType,
}: {
  projectId: string
  type: InventoryType
  onEditType: () => void
  onDeleteType: () => void
}) {
  const { data: items, isLoading } = useInventoryItems(projectId, type.id)
  const upsertItem = useUpsertInventoryItem(projectId, type.id)
  const deleteItem = useDeleteInventoryItem(projectId, type.id)

  const [itemModalOpen, setItemModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [values, setValues] = useState<Record<string, string | number | null>>({})
  const [pendingDeleteItem, setPendingDeleteItem] = useState<string | null>(null)

  function openCreateItem() {
    setEditingItem(null)
    setValues({})
    setItemModalOpen(true)
  }

  function openEditItem(item: InventoryItem) {
    setEditingItem(item)
    setValues(item.data)
    setItemModalOpen(true)
  }

  async function handleSaveItem(e: React.FormEvent) {
    e.preventDefault()
    await upsertItem.mutateAsync({ id: editingItem?.id, data: values })
    setItemModalOpen(false)
  }

  return (
    <div className="min-w-0 border-2 border-ink bg-ink-soft shadow-brutal">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-ink p-4">
        <h2 className="text-display text-lg">{type.name}</h2>
        <div className="flex items-center gap-2">
          <Button size="sm" icon={<Plus size={14} />} onClick={openCreateItem}>
            Novo item
          </Button>
          <button
            type="button"
            onClick={onEditType}
            aria-label="Editar tipo"
            className="cursor-pointer border-2 border-ink p-1.5 text-paper/60 hover:bg-accent-blue hover:text-ink"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={onDeleteType}
            aria-label="Excluir tipo"
            className="cursor-pointer border-2 border-ink p-1.5 text-paper/60 hover:bg-accent-red hover:text-paper"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="p-4">
        {isLoading && <p className="text-label text-sm text-paper/50">Carregando…</p>}
        {!isLoading && items?.length === 0 && (
          <EmptyState title="Nenhum item ainda" description="Adicione o primeiro item desse tipo." />
        )}
        {!isLoading && items && items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] border-collapse text-sm">
              <thead>
                <tr className="text-label border-b-2 border-ink text-left text-[11px] text-paper/60">
                  {type.fields_schema.map((f) => (
                    <th key={f.key} className="py-2 pr-4 font-semibold">
                      {f.label}
                    </th>
                  ))}
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="cursor-pointer border-b border-ink/30 hover:bg-ink"
                    onClick={() => openEditItem(item)}
                  >
                    {type.fields_schema.map((f) => (
                      <td key={f.key} className="max-w-[220px] truncate py-2.5 pr-4 text-paper/85">
                        {String(item.data[f.key] ?? '—')}
                      </td>
                    ))}
                    <td className="py-2.5 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setPendingDeleteItem(item.id)
                        }}
                        aria-label="Excluir item"
                        className="cursor-pointer border-2 border-ink p-1 text-paper/50 hover:bg-accent-red hover:text-paper"
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={itemModalOpen}
        onClose={() => setItemModalOpen(false)}
        title={editingItem ? `Editar ${type.name.replace(/s$/, '')}` : `Novo ${type.name.replace(/s$/, '')}`}
      >
        <form onSubmit={handleSaveItem}>
          <ItemForm fields={type.fields_schema} values={values} onChange={setValues} />
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setItemModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={upsertItem.isPending}>
              Salvar
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDeleteItem)}
        onClose={() => setPendingDeleteItem(null)}
        onConfirm={() => pendingDeleteItem && deleteItem.mutate(pendingDeleteItem)}
        title="Excluir item"
        description="Essa ação não pode ser desfeita."
        confirmLabel="Excluir"
      />
    </div>
  )
}
