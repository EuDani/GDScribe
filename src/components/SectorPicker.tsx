import { clsx } from 'clsx'
import type { ProjectSector } from '@/lib/types'

/** Seletor multi-setor com opção "Todos" (array vazio = todos os setores). */
export function SectorPicker({
  value,
  onChange,
  sectors,
}: {
  value: string[]
  onChange: (sectorIds: string[]) => void
  sectors: ProjectSector[]
}) {
  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((s) => s !== id) : [...value, id])
  }

  if (sectors.length === 0) {
    return <p className="text-xs text-canvas-fg/40">Nenhum setor cadastrado ainda — crie em Configurações → Setores.</p>
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        type="button"
        onClick={() => onChange([])}
        className={clsx(
          'text-label border-2 border-line px-2 py-1 text-[10px]',
          value.length === 0 ? 'bg-accent-yellow text-ink' : 'bg-transparent text-canvas-fg/50 hover:text-canvas-fg',
        )}
      >
        Todos
      </button>
      {sectors.map((sector) => (
        <button
          key={sector.id}
          type="button"
          onClick={() => toggle(sector.id)}
          className={clsx(
            'text-label inline-flex items-center gap-1 border-2 px-2 py-1 text-[10px]',
            value.includes(sector.id) ? 'border-ink text-ink' : 'border-line text-canvas-fg/50 hover:text-canvas-fg',
          )}
          style={value.includes(sector.id) ? { backgroundColor: sector.color } : undefined}
        >
          {sector.name}
        </button>
      ))}
    </div>
  )
}

/** Chips de filtro por setor pra usar no topo de uma página (multi-select, "Todos" = nenhum selecionado). */
export function SectorFilterBar({
  value,
  onChange,
  sectors,
}: {
  value: string[]
  onChange: (sectorIds: string[]) => void
  sectors: ProjectSector[]
}) {
  if (sectors.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-label text-[10px] text-canvas-fg/40">Setor:</span>
      <SectorPicker value={value} onChange={onChange} sectors={sectors} />
    </div>
  )
}

/** true se o item deve aparecer sob o filtro ativo (filtro vazio = mostra tudo). */
export function matchesSectorFilter(itemSectors: string[], filter: string[]): boolean {
  if (filter.length === 0) return true
  if (itemSectors.length === 0) return true
  return itemSectors.some((s) => filter.includes(s))
}
