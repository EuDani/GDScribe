import { useMemo } from 'react'
import { AlertTriangle, CalendarClock } from 'lucide-react'
import { Link, useOutletContext } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { MiniBarChart } from '@/components/MiniBarChart'
import { PHASES, type Project } from '@/lib/types'
import { useGddModules } from '@/features/gdd/useGddModules'
import { useAllInventoryItems, useInventoryTypes } from '@/features/inventory/useInventory'
import { useKanbanCards, useKanbanColumns } from '@/features/kanban/useKanban'
import { IDEA_STATUSES } from '@/lib/types'
import { useIdeas } from '@/features/ideas/useIdeas'

function formatDate(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y.slice(2)}`
}

export function OverviewPage() {
  const { project } = useOutletContext<{ project: Project }>()
  const { data: modules } = useGddModules(project.id)
  const { data: invTypes } = useInventoryTypes(project.id)
  const { data: invItems } = useAllInventoryItems(project.id)
  const { data: columns } = useKanbanColumns(project.id)
  const { data: cards } = useKanbanCards(project.id)
  const { data: ideas } = useIdeas(project.id)

  const moduleStats = useMemo(() => {
    const total = modules?.length ?? 0
    const filled = modules?.filter((m) => m.content.trim().length > 0).length ?? 0
    const byPhase = PHASES.filter((p) => p.value !== 'all').map((p) => ({
      label: p.label,
      value: modules?.filter((m) => m.phase === p.value).length ?? 0,
    }))
    return { total, filled, byPhase }
  }, [modules])

  const inventoryByType = useMemo(
    () =>
      (invTypes ?? []).map((t) => ({
        label: t.name,
        value: (invItems ?? []).filter((i) => i.type_id === t.id).length,
      })),
    [invTypes, invItems],
  )

  const cardsByColumn = useMemo(
    () =>
      (columns ?? []).map((c) => ({
        label: c.name,
        value: (cards ?? []).filter((card) => card.column_id === c.id).length,
      })),
    [columns, cards],
  )

  const ideasByStatus = useMemo(
    () =>
      IDEA_STATUSES.map((s) => ({
        label: s.label,
        value: (ideas ?? []).filter((i) => i.status === s.value).length,
      })),
    [ideas],
  )

  const upcoming = useMemo(
    () =>
      (cards ?? [])
        .filter((c) => c.due_date)
        .sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1))
        .slice(0, 6),
    [cards],
  )

  const today = new Date().toDateString()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-display text-2xl">{project.name}</h1>
        {project.description && <p className="mt-1 text-sm text-canvas-fg/60">{project.description}</p>}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-label text-[10px] text-canvas-fg/50">Módulos de GDD</p>
          <p className="text-display mt-1 text-3xl text-accent-yellow">
            {moduleStats.filled}
            <span className="text-lg text-canvas-fg/40">/{moduleStats.total}</span>
          </p>
          <p className="mt-1 text-xs text-canvas-fg/50">preenchidos</p>
        </Card>
        <Card>
          <p className="text-label text-[10px] text-canvas-fg/50">Itens no inventário</p>
          <p className="text-display mt-1 text-3xl text-accent-blue">{invItems?.length ?? 0}</p>
          <p className="mt-1 text-xs text-canvas-fg/50">em {invTypes?.length ?? 0} tipos</p>
        </Card>
        <Card>
          <p className="text-label text-[10px] text-canvas-fg/50">Cards no kanban</p>
          <p className="text-display mt-1 text-3xl text-accent-green">{cards?.length ?? 0}</p>
          <p className="mt-1 text-xs text-canvas-fg/50">em {columns?.length ?? 0} colunas</p>
        </Card>
        <Card>
          <p className="text-label text-[10px] text-canvas-fg/50">Ideias</p>
          <p className="text-display mt-1 text-3xl text-accent-purple">{ideas?.length ?? 0}</p>
          <p className="mt-1 text-xs text-canvas-fg/50">
            {(ideas ?? []).filter((i) => i.status === 'approved').length} aprovadas
          </p>
        </Card>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-display mb-3 text-sm">Módulos por fase</h2>
          <MiniBarChart points={moduleStats.byPhase} />
        </Card>
        <Card>
          <h2 className="text-display mb-3 text-sm">Inventário por tipo</h2>
          {inventoryByType.length > 0 ? (
            <MiniBarChart points={inventoryByType} />
          ) : (
            <p className="text-xs text-canvas-fg/40">Nenhum tipo de inventário ainda.</p>
          )}
        </Card>
        <Card>
          <h2 className="text-display mb-3 text-sm">Cards por coluna</h2>
          {cardsByColumn.length > 0 ? (
            <MiniBarChart points={cardsByColumn} />
          ) : (
            <p className="text-xs text-canvas-fg/40">Nenhuma coluna ainda.</p>
          )}
        </Card>
        <Card>
          <h2 className="text-display mb-3 text-sm">Ideias por status</h2>
          <MiniBarChart points={ideasByStatus} />
        </Card>
      </div>

      <Card className="mt-5">
        <h2 className="text-display mb-3 flex items-center gap-2 text-sm">
          <CalendarClock size={16} /> Próximos prazos
        </h2>
        {upcoming.length === 0 ? (
          <p className="text-xs text-canvas-fg/40">Nenhum card com data de conclusão.</p>
        ) : (
          <ul className="space-y-1.5">
            {upcoming.map((card) => {
              const overdue = card.due_date! < new Date(today).toISOString().slice(0, 10)
              return (
                <li key={card.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate text-canvas-fg/80">{card.title}</span>
                  <span
                    className={`text-label flex items-center gap-1 text-[11px] ${overdue ? 'text-accent-red' : 'text-canvas-fg/50'}`}
                  >
                    {overdue && <AlertTriangle size={11} />}
                    {formatDate(card.due_date!)}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
        <Link to="calendar" className="text-label mt-3 inline-block text-[11px] text-accent-yellow hover:underline">
          Ver calendário completo →
        </Link>
      </Card>
    </div>
  )
}
