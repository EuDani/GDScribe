import { StatusBadge } from '@/components/StatusSelect'
import { Badge, accentFromString } from '@/components/ui/Badge'
import type { InventoryItem, InventoryType } from '@/lib/types'
import { formatInventoryValue } from '@/features/inventory/ItemForm'

export function InventoryListView({
  projectId,
  type,
  items,
  onItemClick,
}: {
  projectId: string
  type: InventoryType
  items: InventoryItem[]
  onItemClick: (item: InventoryItem) => void
}) {
  const primary = type.fields_schema[0]
  const secondary = type.fields_schema.slice(1, 4)

  return (
    <div className="divide-y divide-line/20 border-2 border-line/30">
      {items.map((item) => {
        const title = primary ? formatInventoryValue(item.data[primary.key], primary.type) || 'Sem título' : 'Item'
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onItemClick(item)}
            className="flex w-full cursor-pointer items-center gap-4 px-3 py-2.5 text-left hover:bg-canvas"
          >
            <span className="w-40 shrink-0 truncate text-sm font-semibold text-canvas-fg">{title}</span>
            <div className="hidden min-w-0 flex-1 items-center gap-4 overflow-hidden lg:flex">
              {secondary.map((f) => (
                <span key={f.key} className="min-w-0 truncate text-xs text-canvas-fg/60">
                  <span className="text-canvas-fg/40">{f.label}: </span>
                  {formatInventoryValue(item.data[f.key], f.type)}
                </span>
              ))}
            </div>
            {item.tags.length > 0 && (
              <div className="hidden shrink-0 gap-1 md:flex">
                {item.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} accent={accentFromString(tag)}>
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
            <span className="ml-auto shrink-0">
              <StatusBadge projectId={projectId} value={item.status} />
            </span>
          </button>
        )
      })}
    </div>
  )
}
