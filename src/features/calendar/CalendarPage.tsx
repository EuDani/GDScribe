import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { clsx } from 'clsx'
import { useOutletContext } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Tabs } from '@/components/ui/Tabs'
import type { KanbanCard, Project } from '@/lib/types'
import { useKanbanCards, useKanbanColumns } from '@/features/kanban/useKanban'
import {
  MONTH_LABELS,
  WEEKDAY_LABELS,
  getMonthGrid,
  getWeekDays,
  isSameDay,
  toISODate,
} from '@/lib/dateUtils'

type ViewMode = 'week' | 'month' | 'year' | 'roadmap'

const VIEW_ITEMS: { value: ViewMode; label: string }[] = [
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mês' },
  { value: 'year', label: 'Ano' },
  { value: 'roadmap', label: 'Roadmap' },
]

export function CalendarPage() {
  const { project } = useOutletContext<{ project: Project }>()
  const { data: cards } = useKanbanCards(project.id)
  const { data: columns } = useKanbanColumns(project.id)
  const [view, setView] = useState<ViewMode>('month')
  const [anchor, setAnchor] = useState(new Date())

  const columnColor = useMemo(() => {
    const map = new Map<string, string>()
    columns?.forEach((c) => map.set(c.id, c.color))
    return map
  }, [columns])

  const cardsByDate = useMemo(() => {
    const map = new Map<string, KanbanCard[]>()
    for (const card of cards ?? []) {
      if (!card.due_date) continue
      const list = map.get(card.due_date) ?? []
      list.push(card)
      map.set(card.due_date, list)
    }
    return map
  }, [cards])

  function shift(amount: number) {
    setAnchor((prev) => {
      const next = new Date(prev)
      if (view === 'week') next.setDate(next.getDate() + amount * 7)
      else if (view === 'month') next.setMonth(next.getMonth() + amount)
      else if (view === 'year') next.setFullYear(next.getFullYear() + amount)
      return next
    })
  }

  const heading = useMemo(() => {
    if (view === 'week') {
      const days = getWeekDays(anchor)
      return `${days[0].getDate()} — ${days[6].getDate()} de ${MONTH_LABELS[days[6].getMonth()]} ${days[6].getFullYear()}`
    }
    if (view === 'month') return `${MONTH_LABELS[anchor.getMonth()]} ${anchor.getFullYear()}`
    if (view === 'year') return `${anchor.getFullYear()}`
    return 'Linha do tempo'
  }, [view, anchor])

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-display text-2xl">Calendário</h1>
        <Tabs items={VIEW_ITEMS} value={view} onChange={setView} />
      </div>

      {view !== 'roadmap' && (
        <div className="mb-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => shift(-1)}
            className="cursor-pointer border-2 border-line p-1.5 text-canvas-fg/70 hover:bg-accent-yellow hover:text-ink"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => shift(1)}
            className="cursor-pointer border-2 border-line p-1.5 text-canvas-fg/70 hover:bg-accent-yellow hover:text-ink"
          >
            <ChevronRight size={16} />
          </button>
          <Button size="sm" variant="ghost" onClick={() => setAnchor(new Date())}>
            Hoje
          </Button>
          <h2 className="text-display text-lg">{heading}</h2>
        </div>
      )}

      {view === 'month' && (
        <MonthView anchor={anchor} cardsByDate={cardsByDate} columnColor={columnColor} />
      )}
      {view === 'week' && (
        <WeekView anchor={anchor} cardsByDate={cardsByDate} columnColor={columnColor} />
      )}
      {view === 'year' && (
        <YearView
          anchor={anchor}
          cardsByDate={cardsByDate}
          onPickMonth={(m) => {
            setAnchor(new Date(anchor.getFullYear(), m, 1))
            setView('month')
          }}
        />
      )}
      {view === 'roadmap' && <RoadmapView cards={cards ?? []} columnColor={columnColor} />}
    </div>
  )
}

function DayChip({ card, color }: { card: KanbanCard; color?: string }) {
  return (
    <div
      className="truncate border-2 border-line px-1.5 py-0.5 text-[10px] text-ink"
      style={{ backgroundColor: color ?? 'var(--color-accent-yellow)' }}
      title={card.title}
    >
      {card.title}
    </div>
  )
}

function MonthView({
  anchor,
  cardsByDate,
  columnColor,
}: {
  anchor: Date
  cardsByDate: Map<string, KanbanCard[]>
  columnColor: Map<string, string>
}) {
  const grid = getMonthGrid(anchor)
  const today = new Date()

  return (
    <div className="border-2 border-line">
      <div className="grid grid-cols-7 border-b-2 border-line">
        {WEEKDAY_LABELS.map((d) => (
          <div key={d} className="text-label border-r border-line/30 p-2 text-center text-[10px] text-canvas-fg/50 last:border-r-0">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {grid.map((date, i) => {
          const iso = toISODate(date)
          const dayCards = cardsByDate.get(iso) ?? []
          const inMonth = date.getMonth() === anchor.getMonth()
          return (
            <div
              key={i}
              className={clsx(
                'min-h-[92px] border-b border-r border-line/30 p-1.5 [&:nth-child(7n)]:border-r-0',
                !inMonth && 'bg-canvas/40',
              )}
            >
              <div
                className={clsx(
                  'text-label mb-1 inline-flex h-5 w-5 items-center justify-center text-[10px]',
                  isSameDay(date, today) && 'bg-accent-yellow text-ink',
                  !inMonth && 'text-canvas-fg/30',
                )}
              >
                {date.getDate()}
              </div>
              <div className="space-y-1">
                {dayCards.slice(0, 3).map((card) => (
                  <DayChip key={card.id} card={card} color={columnColor.get(card.column_id)} />
                ))}
                {dayCards.length > 3 && (
                  <p className="text-label text-[10px] text-canvas-fg/40">+{dayCards.length - 3}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function WeekView({
  anchor,
  cardsByDate,
  columnColor,
}: {
  anchor: Date
  cardsByDate: Map<string, KanbanCard[]>
  columnColor: Map<string, string>
}) {
  const days = getWeekDays(anchor)
  const today = new Date()

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-7">
      {days.map((date) => {
        const iso = toISODate(date)
        const dayCards = cardsByDate.get(iso) ?? []
        return (
          <div key={iso} className="border-2 border-line">
            <div
              className={clsx(
                'text-label border-b-2 border-line p-2 text-center text-[11px]',
                isSameDay(date, today) ? 'bg-accent-yellow text-ink' : 'text-canvas-fg/60',
              )}
            >
              {WEEKDAY_LABELS[date.getDay()]} {date.getDate()}
            </div>
            <div className="min-h-[100px] space-y-1 p-1.5">
              {dayCards.map((card) => (
                <DayChip key={card.id} card={card} color={columnColor.get(card.column_id)} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function YearView({
  anchor,
  cardsByDate,
  onPickMonth,
}: {
  anchor: Date
  cardsByDate: Map<string, KanbanCard[]>
  onPickMonth: (month: number) => void
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {MONTH_LABELS.map((label, month) => {
        const monthAnchor = new Date(anchor.getFullYear(), month, 1)
        const grid = getMonthGrid(monthAnchor)
        return (
          <button
            key={label}
            type="button"
            onClick={() => onPickMonth(month)}
            className="cursor-pointer border-2 border-line bg-surface p-2 text-left hover:border-accent-yellow"
          >
            <p className="text-label mb-1.5 text-[11px] text-canvas-fg/70">{label}</p>
            <div className="grid grid-cols-7 gap-0.5">
              {grid.map((date, i) => {
                const iso = toISODate(date)
                const hasCards = cardsByDate.has(iso)
                const inMonth = date.getMonth() === month
                return (
                  <div
                    key={i}
                    className={clsx(
                      'flex h-4 w-4 items-center justify-center text-[8px]',
                      !inMonth && 'text-canvas-fg/20',
                      inMonth && 'text-canvas-fg/50',
                    )}
                  >
                    {hasCards ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-accent-yellow" />
                    ) : (
                      date.getDate()
                    )}
                  </div>
                )
              })}
            </div>
          </button>
        )
      })}
    </div>
  )
}

function RoadmapView({
  cards,
  columnColor,
}: {
  cards: KanbanCard[]
  columnColor: Map<string, string>
}) {
  const dated = cards.filter((c) => c.due_date)
  if (dated.length === 0) {
    return <p className="text-sm text-canvas-fg/40">Nenhum card com data de conclusão para mostrar no roadmap.</p>
  }

  const starts = dated.map((c) => new Date(c.start_date ?? c.due_date!).getTime())
  const ends = dated.map((c) => new Date(c.due_date!).getTime())
  const min = Math.min(...starts)
  const max = Math.max(...ends, min + 86400000)
  const span = max - min

  const sorted = [...dated].sort(
    (a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime(),
  )

  const todayPct = ((Date.now() - min) / span) * 100

  return (
    <div className="space-y-2">
      <div className="relative h-4 border-b-2 border-line/30">
        {todayPct >= 0 && todayPct <= 100 && (
          <div
            className="absolute top-0 h-full w-0.5 bg-accent-red"
            style={{ left: `${todayPct}%` }}
            title="Hoje"
          />
        )}
      </div>
      {sorted.map((card) => {
        const startMs = new Date(card.start_date ?? card.due_date!).getTime()
        const endMs = new Date(card.due_date!).getTime()
        const left = ((startMs - min) / span) * 100
        const width = Math.max(1.5, ((endMs - startMs) / span) * 100)
        return (
          <div key={card.id} className="flex items-center gap-3">
            <span className="w-40 shrink-0 truncate text-sm text-canvas-fg/80">{card.title}</span>
            <div className="relative h-5 flex-1 border border-line/30 bg-canvas">
              <div
                className="absolute h-full border border-line"
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                  backgroundColor: columnColor.get(card.column_id) ?? 'var(--color-accent-yellow)',
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
