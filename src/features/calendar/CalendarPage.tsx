import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Filter,
  ListChecks,
  Plus,
  Rocket,
  Search,
} from 'lucide-react'
import { clsx } from 'clsx'
import { AnimatePresence, motion } from 'motion/react'
import { useOutletContext } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Tabs } from '@/components/ui/Tabs'
import { Modal } from '@/components/ui/Modal'
import { Badge, accentFromString } from '@/components/ui/Badge'
import { SectorPicker, matchesSectorFilter } from '@/components/SectorPicker'
import {
  REMINDER_IMPORTANCE,
  isReminderOverdue,
  type KanbanCard,
  type Project,
  type ProjectRelease,
  type Reminder,
  type ReminderImportance,
} from '@/lib/types'
import { useAllKanbanCards, useAllKanbanColumns } from '@/features/kanban/useKanban'
import { useReminders } from '@/features/reminders/useReminders'
import { ReminderModal } from '@/features/reminders/ReminderModal'
import { useProjectReleases } from '@/features/settings/useProjectReleases'
import { useProjectSectors } from '@/features/settings/useProjectSectors'
import {
  MONTH_LABELS,
  WEEKDAY_LABELS,
  addDays,
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
  const { data: cards } = useAllKanbanCards(project.id)
  const { data: columns } = useAllKanbanColumns(project.id)
  const { data: reminders } = useReminders(project.id)
  const { data: releases } = useProjectReleases(project.id)
  const { data: sectors } = useProjectSectors(project.id)
  const [view, setView] = useState<ViewMode>('month')
  const [anchor, setAnchor] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [reminderModal, setReminderModal] = useState<{ reminder?: Reminder; date?: string } | null>(null)
  const [tagFilter, setTagFilter] = useState<Set<string>>(new Set())
  const [importanceFilter, setImportanceFilter] = useState<Set<ReminderImportance>>(new Set())
  const [sectorFilter, setSectorFilter] = useState<string[]>([])
  const [search, setSearch] = useState('')

  const columnColor = useMemo(() => {
    const map = new Map<string, string>()
    columns?.forEach((c) => map.set(c.id, c.color))
    return map
  }, [columns])

  const allTags = useMemo(
    () => Array.from(new Set((reminders ?? []).flatMap((r) => r.tags))).sort(),
    [reminders],
  )

  const filteredReminders = useMemo(
    () =>
      (reminders ?? []).filter((r) => {
        const tagOk = tagFilter.size === 0 || r.tags.some((t) => tagFilter.has(t))
        const importanceOk = importanceFilter.size === 0 || importanceFilter.has(r.importance)
        const sectorOk = matchesSectorFilter(r.sectors, sectorFilter)
        const searchOk = search.trim() === '' || r.title.toLowerCase().includes(search.trim().toLowerCase())
        return tagOk && importanceOk && sectorOk && searchOk
      }),
    [reminders, tagFilter, importanceFilter, sectorFilter, search],
  )

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

  const remindersByDate = useMemo(() => {
    const map = new Map<string, Reminder[]>()
    for (const reminder of filteredReminders) {
      const list = map.get(reminder.event_date) ?? []
      list.push(reminder)
      map.set(reminder.event_date, list)
    }
    return map
  }, [filteredReminders])

  const releasesByDate = useMemo(() => {
    const map = new Map<string, ProjectRelease[]>()
    for (const release of releases ?? []) {
      const list = map.get(release.release_date) ?? []
      list.push(release)
      map.set(release.release_date, list)
    }
    return map
  }, [releases])

  const stats = useMemo(() => {
    const now = new Date()
    const todayIso = toISODate(now)
    const weekEndIso = toISODate(addDays(now, 7))
    const monthEndIso = toISODate(new Date(now.getFullYear(), now.getMonth() + 1, 0))
    let overdue = 0
    let dueWeek = 0
    let dueMonth = 0
    let total = 0
    for (const card of cards ?? []) {
      if (!card.due_date) continue
      total++
      if (card.due_date < todayIso) overdue++
      if (card.due_date >= todayIso && card.due_date <= weekEndIso) dueWeek++
      if (card.due_date >= todayIso && card.due_date <= monthEndIso) dueMonth++
    }
    return { overdue, dueWeek, dueMonth, total }
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

  function toggleTag(tag: string) {
    setTagFilter((prev) => {
      const next = new Set(prev)
      if (next.has(tag)) next.delete(tag)
      else next.add(tag)
      return next
    })
  }

  function toggleImportance(value: ReminderImportance) {
    setImportanceFilter((prev) => {
      const next = new Set(prev)
      if (next.has(value)) next.delete(value)
      else next.add(value)
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

  const selectedDayCards = selectedDate ? (cardsByDate.get(selectedDate) ?? []) : []
  const selectedDayReminders = selectedDate ? (remindersByDate.get(selectedDate) ?? []) : []
  const selectedDayReleases = selectedDate ? (releasesByDate.get(selectedDate) ?? []) : []
  const hasActiveFilters =
    tagFilter.size > 0 || importanceFilter.size > 0 || sectorFilter.length > 0 || search.trim() !== ''

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-display text-2xl">Calendário</h1>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            size="sm"
            icon={<Plus size={14} />}
            onClick={() => setReminderModal({ date: toISODate(new Date()) })}
          >
            Lembrete
          </Button>
          <Tabs items={VIEW_ITEMS} value={view} onChange={setView} />
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card padded={false} className="p-3">
          <div className="flex items-center gap-2 text-accent-red">
            <AlertTriangle size={16} />
            <span className="text-display text-xl">{stats.overdue}</span>
          </div>
          <p className="text-label mt-1 text-[10px] text-canvas-fg/50">Atrasados</p>
        </Card>
        <Card padded={false} className="p-3">
          <div className="flex items-center gap-2 text-accent-yellow">
            <CalendarClock size={16} />
            <span className="text-display text-xl">{stats.dueWeek}</span>
          </div>
          <p className="text-label mt-1 text-[10px] text-canvas-fg/50">Nos próximos 7 dias</p>
        </Card>
        <Card padded={false} className="p-3">
          <div className="flex items-center gap-2 text-accent-blue">
            <CalendarRange size={16} />
            <span className="text-display text-xl">{stats.dueMonth}</span>
          </div>
          <p className="text-label mt-1 text-[10px] text-canvas-fg/50">Neste mês</p>
        </Card>
        <Card padded={false} className="p-3">
          <div className="flex items-center gap-2 text-accent-green">
            <ListChecks size={16} />
            <span className="text-display text-xl">{stats.total}</span>
          </div>
          <p className="text-label mt-1 text-[10px] text-canvas-fg/50">Total agendado</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[200px_1fr]">
        <aside className="space-y-4 border-2 border-line bg-surface p-3 lg:sticky lg:top-4 lg:self-start">
          <div className="flex items-center gap-1.5 text-canvas-fg/70">
            <Filter size={13} />
            <span className="text-label text-[11px]">Filtrar lembretes</span>
          </div>

          <div className="flex items-center gap-1.5 border-2 border-line bg-paper px-2 py-1.5 text-ink">
            <Search size={12} className="shrink-0 text-ink/50" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar lembrete…"
              className="w-full min-w-0 bg-transparent text-xs outline-none placeholder:text-ink/40"
            />
          </div>

          <div>
            <p className="text-label mb-1.5 text-[10px] text-canvas-fg/50">Importância</p>
            <div className="space-y-1">
              {REMINDER_IMPORTANCE.map((imp) => (
                <button
                  key={imp.value}
                  type="button"
                  onClick={() => toggleImportance(imp.value)}
                  className={clsx(
                    'flex w-full cursor-pointer items-center gap-1.5 border-2 px-2 py-1 text-left text-[11px]',
                    importanceFilter.has(imp.value)
                      ? 'border-line text-canvas-fg'
                      : 'border-transparent text-canvas-fg/50 hover:text-canvas-fg',
                  )}
                >
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: imp.color }} />
                  {imp.label}
                </button>
              ))}
            </div>
          </div>

          {allTags.length > 0 && (
            <div>
              <p className="text-label mb-1.5 text-[10px] text-canvas-fg/50">Tags</p>
              <div className="flex flex-wrap gap-1">
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
            </div>
          )}

          {(sectors ?? []).length > 0 && (
            <div>
              <p className="text-label mb-1.5 text-[10px] text-canvas-fg/50">Setor</p>
              <SectorPicker value={sectorFilter} onChange={setSectorFilter} sectors={sectors ?? []} />
            </div>
          )}

          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setTagFilter(new Set())
                setImportanceFilter(new Set())
                setSectorFilter([])
                setSearch('')
              }}
              className="text-label text-[11px] text-canvas-fg/40 underline hover:text-canvas-fg"
            >
              limpar filtros
            </button>
          )}
        </aside>

        <div className="min-w-0">
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

          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {view === 'month' && (
                <MonthView
                  anchor={anchor}
                  cardsByDate={cardsByDate}
                  remindersByDate={remindersByDate}
                  releasesByDate={releasesByDate}
                  columnColor={columnColor}
                  onPickDay={setSelectedDate}
                />
              )}
              {view === 'week' && (
                <WeekView
                  anchor={anchor}
                  cardsByDate={cardsByDate}
                  remindersByDate={remindersByDate}
                  releasesByDate={releasesByDate}
                  columnColor={columnColor}
                  onPickDay={setSelectedDate}
                />
              )}
              {view === 'year' && (
                <YearView
                  anchor={anchor}
                  cardsByDate={cardsByDate}
                  remindersByDate={remindersByDate}
                  releasesByDate={releasesByDate}
                  onPickMonth={(m) => {
                    setAnchor(new Date(anchor.getFullYear(), m, 1))
                    setView('month')
                  }}
                />
              )}
              {view === 'roadmap' && (
                <RoadmapView
                  cards={cards ?? []}
                  columnColor={columnColor}
                  reminders={filteredReminders}
                  releases={releases ?? []}
                  onPickReminder={(reminder) => setReminderModal({ reminder })}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <Modal open={Boolean(selectedDate)} onClose={() => setSelectedDate(null)} title={selectedDate ?? ''}>
        <div className="space-y-4">
          {selectedDayReleases.length > 0 && (
            <div>
              <p className="text-label mb-1.5 text-[10px] text-canvas-fg/50">Lançamentos</p>
              <div className="space-y-2">
                {selectedDayReleases.map((release) => (
                  <div key={release.id} className="flex items-start gap-2.5 border-2 border-line bg-accent-blue/20 p-3">
                    <Rocket size={14} className="mt-0.5 shrink-0 text-accent-blue" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-canvas-fg">
                        {release.name}
                        {release.version && <span className="ml-1.5 text-canvas-fg/50">{release.version}</span>}
                      </p>
                      {release.notes && <p className="mt-0.5 text-xs text-canvas-fg/60">{release.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedDayReminders.length > 0 && (
            <div>
              <p className="text-label mb-1.5 text-[10px] text-canvas-fg/50">Lembretes</p>
              <div className="space-y-2">
                {selectedDayReminders.map((reminder) => {
                  const imp = REMINDER_IMPORTANCE.find((i) => i.value === reminder.importance)!
                  return (
                    <button
                      key={reminder.id}
                      type="button"
                      onClick={() => {
                        setSelectedDate(null)
                        setReminderModal({ reminder })
                      }}
                      className="flex w-full cursor-pointer items-start gap-2.5 border-2 border-line bg-accent-yellow p-3 text-left text-ink"
                    >
                      {reminder.image_url && (
                        <img src={reminder.image_url} alt="" className="h-10 w-10 shrink-0 border-2 border-ink object-cover" />
                      )}
                      <Bell size={14} className="mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{reminder.title}</p>
                        <p className="text-label text-[10px] opacity-70">
                          {reminder.event_time ?? ''} {imp.label}
                        </p>
                        {reminder.tags.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {reminder.tags.map((tag) => (
                              <Badge key={tag} accent={accentFromString(tag)}>
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {selectedDayCards.length > 0 && (
            <div>
              <p className="text-label mb-1.5 text-[10px] text-canvas-fg/50">Cards do kanban</p>
              <div className="space-y-2">
                {selectedDayCards.map((card) => (
                  <div key={card.id} className="border-2 border-line/40 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-canvas-fg">{card.title}</p>
                      <span
                        className="h-2.5 w-2.5 shrink-0 border border-line"
                        style={{ backgroundColor: columnColor.get(card.column_id) }}
                      />
                    </div>
                    {card.description && <p className="mt-1 text-xs text-canvas-fg/60">{card.description}</p>}
                    {card.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {card.tags.map((tag) => (
                          <Badge key={tag} accent={accentFromString(tag)}>
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button
            size="sm"
            variant="ghost"
            icon={<Plus size={14} />}
            onClick={() => {
              const date = selectedDate
              setSelectedDate(null)
              setReminderModal({ date: date ?? undefined })
            }}
          >
            Novo lembrete nesse dia
          </Button>
        </div>
      </Modal>

      <ReminderModal
        projectId={project.id}
        open={Boolean(reminderModal)}
        onClose={() => setReminderModal(null)}
        reminder={reminderModal?.reminder}
        defaultDate={reminderModal?.date}
      />
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

function ReleaseChip({ release }: { release: ProjectRelease }) {
  return (
    <div
      className="flex items-center gap-1 truncate border-2 border-line bg-accent-blue px-1.5 py-0.5 text-[10px] text-ink"
      title={release.name}
    >
      <Rocket size={9} className="shrink-0" />
      {release.name}
    </div>
  )
}

function ReminderChip({ reminder }: { reminder: Reminder }) {
  const imp = REMINDER_IMPORTANCE.find((i) => i.value === reminder.importance)
  return (
    <div
      className="flex items-center gap-1 truncate border-2 border-line bg-accent-purple px-1.5 py-0.5 text-[10px] text-ink"
      title={reminder.title}
      style={imp && reminder.importance === 'high' ? { boxShadow: `inset 2px 0 0 0 ${imp.color}` } : undefined}
    >
      <Bell size={9} className="shrink-0" />
      {reminder.title}
    </div>
  )
}

function MonthView({
  anchor,
  cardsByDate,
  remindersByDate,
  releasesByDate,
  columnColor,
  onPickDay,
}: {
  anchor: Date
  cardsByDate: Map<string, KanbanCard[]>
  remindersByDate: Map<string, Reminder[]>
  releasesByDate: Map<string, ProjectRelease[]>
  columnColor: Map<string, string>
  onPickDay: (iso: string) => void
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
          const dayReminders = remindersByDate.get(iso) ?? []
          const dayReleases = releasesByDate.get(iso) ?? []
          const total = dayCards.length + dayReminders.length + dayReleases.length
          const inMonth = date.getMonth() === anchor.getMonth()
          return (
            <button
              key={i}
              type="button"
              disabled={total === 0}
              onClick={() => onPickDay(iso)}
              className={clsx(
                'min-h-[92px] border-b border-r border-line/30 p-1.5 text-left transition-colors [&:nth-child(7n)]:border-r-0',
                !inMonth && 'bg-canvas/40',
                total > 0 ? 'cursor-pointer hover:bg-accent-yellow/10' : 'cursor-default',
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
                {dayReleases.slice(0, 1).map((release) => (
                  <ReleaseChip key={release.id} release={release} />
                ))}
                {dayReminders.slice(0, dayReleases.length > 0 ? 1 : 2).map((reminder) => (
                  <ReminderChip key={reminder.id} reminder={reminder} />
                ))}
                {dayCards.slice(0, Math.max(0, 3 - dayReleases.length - Math.min(2, dayReminders.length))).map((card) => (
                  <DayChip key={card.id} card={card} color={columnColor.get(card.column_id)} />
                ))}
                {total > 3 && <p className="text-label text-[10px] text-canvas-fg/40">+{total - 3}</p>}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function WeekView({
  anchor,
  cardsByDate,
  remindersByDate,
  releasesByDate,
  columnColor,
  onPickDay,
}: {
  anchor: Date
  cardsByDate: Map<string, KanbanCard[]>
  remindersByDate: Map<string, Reminder[]>
  releasesByDate: Map<string, ProjectRelease[]>
  columnColor: Map<string, string>
  onPickDay: (iso: string) => void
}) {
  const days = getWeekDays(anchor)
  const today = new Date()

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-7">
      {days.map((date) => {
        const iso = toISODate(date)
        const dayCards = cardsByDate.get(iso) ?? []
        const dayReminders = remindersByDate.get(iso) ?? []
        const dayReleases = releasesByDate.get(iso) ?? []
        const total = dayCards.length + dayReminders.length + dayReleases.length
        return (
          <button
            type="button"
            key={iso}
            onClick={() => total > 0 && onPickDay(iso)}
            className={clsx(
              'border-2 border-line text-left',
              total > 0 ? 'cursor-pointer hover:bg-accent-yellow/10' : 'cursor-default',
            )}
          >
            <div
              className={clsx(
                'text-label border-b-2 border-line p-2 text-center text-[11px]',
                isSameDay(date, today) ? 'bg-accent-yellow text-ink' : 'text-canvas-fg/60',
              )}
            >
              {WEEKDAY_LABELS[date.getDay()]} {date.getDate()}
            </div>
            <div className="min-h-[100px] space-y-1 p-1.5">
              {dayReleases.map((release) => (
                <ReleaseChip key={release.id} release={release} />
              ))}
              {dayReminders.map((reminder) => (
                <ReminderChip key={reminder.id} reminder={reminder} />
              ))}
              {dayCards.map((card) => (
                <DayChip key={card.id} card={card} color={columnColor.get(card.column_id)} />
              ))}
            </div>
          </button>
        )
      })}
    </div>
  )
}

function YearView({
  anchor,
  cardsByDate,
  remindersByDate,
  releasesByDate,
  onPickMonth,
}: {
  anchor: Date
  cardsByDate: Map<string, KanbanCard[]>
  remindersByDate: Map<string, Reminder[]>
  releasesByDate: Map<string, ProjectRelease[]>
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
                const hasCards = cardsByDate.has(iso) || remindersByDate.has(iso) || releasesByDate.has(iso)
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

function GanttTimeline({
  cards,
  columnColor,
}: {
  cards: KanbanCard[]
  columnColor: Map<string, string>
}) {
  const dated = cards.filter((c) => c.due_date)
  if (dated.length === 0) return null

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
      <h3 className="text-label text-[11px] text-canvas-fg/50">Cards do kanban com data</h3>
      <div className="relative h-4 border-b-2 border-line/30">
        {todayPct >= 0 && todayPct <= 100 && (
          <div
            className="absolute top-0 h-full w-0.5 bg-accent-red"
            style={{ left: `${todayPct}%` }}
            title="Hoje"
          />
        )}
      </div>
      {sorted.map((card, i) => {
        const startMs = new Date(card.start_date ?? card.due_date!).getTime()
        const endMs = new Date(card.due_date!).getTime()
        const left = ((startMs - min) / span) * 100
        const width = Math.max(1.5, ((endMs - startMs) / span) * 100)
        return (
          <div key={card.id} className="flex items-center gap-3">
            <span className="w-40 shrink-0 truncate text-sm text-canvas-fg/80">{card.title}</span>
            <div className="relative h-5 flex-1 border border-line/30 bg-canvas">
              <motion.div
                className="absolute h-full border border-line"
                initial={{ width: 0 }}
                animate={{ width: `${width}%` }}
                transition={{ duration: 0.35, delay: i * 0.02 }}
                style={{
                  left: `${left}%`,
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

function RoadmapView({
  cards,
  columnColor,
  reminders,
  releases,
  onPickReminder,
}: {
  cards: KanbanCard[]
  columnColor: Map<string, string>
  reminders: Reminder[]
  releases: ProjectRelease[]
  onPickReminder: (reminder: Reminder) => void
}) {
  const todayIso = toISODate(new Date())

  const sortedReminders = useMemo(
    () =>
      [...reminders].sort((a, b) => {
        const aKey = `${a.event_date}T${a.event_time ?? '00:00'}`
        const bKey = `${b.event_date}T${b.event_time ?? '00:00'}`
        return aKey < bKey ? -1 : aKey > bKey ? 1 : 0
      }),
    [reminders],
  )

  const sortedReleases = useMemo(
    () => [...releases].sort((a, b) => (a.release_date < b.release_date ? -1 : 1)),
    [releases],
  )

  return (
    <div className="space-y-8">
      <GanttTimeline cards={cards} columnColor={columnColor} />

      {sortedReleases.length > 0 && (
        <div>
          <h3 className="text-label mb-3 text-[11px] text-canvas-fg/50">Lançamentos e atualizações</h3>
          <ul className="space-y-1.5">
            {sortedReleases.map((release, i) => {
              const isPast = release.release_date < todayIso
              const isToday = release.release_date === todayIso
              return (
                <motion.li
                  key={release.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.02 }}
                >
                  <div
                    className={clsx(
                      'flex w-full items-center gap-3 border-2 p-2.5 text-left transition-colors',
                      isPast && 'border-line/30 bg-surface text-canvas-fg/40',
                      isToday && 'border-accent-red bg-accent-red/10 text-canvas-fg',
                      !isPast && !isToday && 'border-accent-blue bg-accent-blue/10 text-canvas-fg',
                    )}
                  >
                    <Rocket size={14} className="shrink-0 opacity-60" />
                    <span className="w-24 shrink-0 text-xs">{release.release_date.split('-').reverse().join('/')}</span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">{release.name}</span>
                    {release.version && (
                      <span className="text-label border border-line/40 px-1 py-0.5 text-[10px] opacity-70">
                        {release.version}
                      </span>
                    )}
                  </div>
                </motion.li>
              )
            })}
          </ul>
        </div>
      )}

      <div>
        <h3 className="text-label mb-3 text-[11px] text-canvas-fg/50">
          Lembretes em ordem — passados em cinza, hoje em vermelho, futuros em azul
        </h3>
        {sortedReminders.length === 0 ? (
          <p className="text-sm text-canvas-fg/40">Nenhum lembrete para mostrar.</p>
        ) : (
          <ul className="space-y-1.5">
            {sortedReminders.map((reminder, i) => {
              const isPast = reminder.event_date < todayIso
              const isToday = reminder.event_date === todayIso
              const imp = REMINDER_IMPORTANCE.find((x) => x.value === reminder.importance)!
              return (
                <motion.li
                  key={reminder.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.02 }}
                >
                  <button
                    type="button"
                    onClick={() => onPickReminder(reminder)}
                    className={clsx(
                      'flex w-full cursor-pointer items-center gap-3 border-2 p-2.5 text-left transition-colors',
                      isPast && 'border-line/30 bg-surface text-canvas-fg/40',
                      isToday && 'border-accent-red bg-accent-red/10 text-canvas-fg',
                      !isPast && !isToday && 'border-accent-blue bg-accent-blue/10 text-canvas-fg',
                    )}
                  >
                    {reminder.image_url ? (
                      <img src={reminder.image_url} alt="" className="h-8 w-8 shrink-0 border border-line object-cover" />
                    ) : (
                      <Bell size={14} className="shrink-0 opacity-60" />
                    )}
                    <span className="w-24 shrink-0 text-xs">
                      {reminder.event_date.split('-').reverse().join('/')}
                      {reminder.event_time && ` ${reminder.event_time}`}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">{reminder.title}</span>
                    {reminder.end_date && (
                      <span className="text-label text-[10px] text-canvas-fg/40">
                        até {reminder.end_date.split('-').reverse().join('/')}
                      </span>
                    )}
                    {isReminderOverdue(reminder) && !isPast && (
                      <Badge accent="red">atrasado</Badge>
                    )}
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: imp.color }} title={imp.label} />
                    {reminder.tags.slice(0, 2).map((tag) => (
                      <Badge key={tag} accent={accentFromString(tag)}>
                        {tag}
                      </Badge>
                    ))}
                  </button>
                </motion.li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
