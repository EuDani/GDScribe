import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { StatusSelect } from '@/components/StatusSelect'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Button } from '@/components/ui/Button'
import type { InventoryItem, InventoryType } from '@/lib/types'
import {
  useDeleteInventoryItem,
  useUpsertInventoryItem,
} from '@/features/inventory/useInventory'

export function InventoryTableView({
  projectId,
  type,
  items,
  onEditItem,
}: {
  projectId: string
  type: InventoryType
  items: InventoryItem[]
  onEditItem: (item: InventoryItem) => void
}) {
  const upsertItem = useUpsertInventoryItem(projectId, type.id)
  const deleteItem = useDeleteInventoryItem(projectId, type.id)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelected((prev) => (prev.size === items.length ? new Set() : new Set(items.map((i) => i.id))))
  }

  function commitField(item: InventoryItem, key: string, value: string | number | null) {
    if (item.data[key] === value) return
    upsertItem.mutate({ id: item.id, data: { ...item.data, [key]: value }, status: item.status })
  }

  function bulkSetStatus(status: string | null) {
    for (const item of items) {
      if (selected.has(item.id)) upsertItem.mutate({ id: item.id, data: item.data, status })
    }
  }

  function bulkDelete() {
    for (const id of selected) deleteItem.mutate(id)
    setSelected(new Set())
  }

  return (
    <div>
      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 border-2 border-line bg-accent-yellow p-2.5 text-ink">
          <span className="text-label text-[11px] font-semibold">{selected.size} selecionado(s)</span>
          <div className="flex items-center gap-1.5">
            <span className="text-label text-[10px]">Status:</span>
            <StatusSelect projectId={projectId} value={null} onChange={bulkSetStatus} className="h-7 text-xs" />
          </div>
          <Button size="sm" variant="danger" icon={<Trash2 size={12} />} onClick={() => setBulkDeleteOpen(true)}>
            Excluir selecionados
          </Button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="text-label ml-auto text-[11px] underline"
          >
            limpar seleção
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="text-label border-b-2 border-line text-left text-[11px] text-canvas-fg/60">
              <th className="w-8 py-2">
                <input
                  type="checkbox"
                  checked={items.length > 0 && selected.size === items.length}
                  onChange={toggleAll}
                  className="h-3.5 w-3.5 cursor-pointer"
                />
              </th>
              {type.fields_schema.map((f) => (
                <th key={f.key} className="py-2 pr-4 font-semibold">
                  {f.label}
                  {f.required && <span className="text-accent-red"> *</span>}
                </th>
              ))}
              <th className="py-2 pr-4 font-semibold">Status</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-line/30">
                <td className="py-1.5">
                  <input
                    type="checkbox"
                    checked={selected.has(item.id)}
                    onChange={() => toggle(item.id)}
                    className="h-3.5 w-3.5 cursor-pointer"
                  />
                </td>
                {type.fields_schema.map((f) => (
                  <td key={f.key} className="max-w-[200px] py-1 pr-4">
                    {f.type === 'select' ? (
                      <select
                        defaultValue={(item.data[f.key] as string) ?? ''}
                        onChange={(e) => commitField(item, f.key, e.target.value)}
                        className="w-full min-w-[100px] border border-line/40 bg-transparent px-1 py-1 text-xs text-canvas-fg"
                      >
                        <option value="">—</option>
                        {f.options?.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : f.type === 'number' ? (
                      <input
                        type="number"
                        defaultValue={(item.data[f.key] as number) ?? ''}
                        onBlur={(e) => commitField(item, f.key, e.target.value === '' ? null : Number(e.target.value))}
                        className="w-full min-w-[70px] border border-line/40 bg-transparent px-1 py-1 text-xs text-canvas-fg"
                      />
                    ) : (
                      <input
                        type="text"
                        defaultValue={(item.data[f.key] as string) ?? ''}
                        onBlur={(e) => commitField(item, f.key, e.target.value)}
                        className="w-full min-w-[100px] truncate border border-line/40 bg-transparent px-1 py-1 text-xs text-canvas-fg"
                      />
                    )}
                  </td>
                ))}
                <td className="py-1 pr-4">
                  <StatusSelect
                    projectId={projectId}
                    value={item.status}
                    onChange={(status) => upsertItem.mutate({ id: item.id, data: item.data, status })}
                    className="min-w-[110px] px-1 py-1 text-xs"
                  />
                </td>
                <td className="py-1 text-right">
                  <button
                    type="button"
                    onClick={() => onEditItem(item)}
                    className="text-label cursor-pointer text-[10px] text-canvas-fg/50 underline hover:text-canvas-fg"
                  >
                    detalhes
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={bulkDelete}
        title="Excluir itens selecionados"
        description={`${selected.size} item(ns) serão excluídos permanentemente.`}
        confirmLabel="Excluir"
      />
    </div>
  )
}
