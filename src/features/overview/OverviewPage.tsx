import { useMemo } from 'react'
import { AlertTriangle, Bell, BookText, Boxes, CalendarClock, KanbanSquare, Lightbulb, ListTodo } from 'lucide-react'
import { motion } from 'motion/react'
import { Link, useOutletContext } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Input'
import { MiniBarChart } from '@/components/MiniBarChart'
import { PHASES, type Project } from '@/lib/types'
import { useGddModules } from '@/features/gdd/useGddModules'
import { useAllInventoryItems, useInventoryTypes } from '@/features/inventory/useInventory'
import { useKanbanCards, useKanbanColumns } from '@/features/kanban/useKanban'
import { IDEA_STATUSES } from '@/lib/types'
import { useIdeas } from '@/features/ideas/useIdeas'
import { useReminders } from '@/features/reminders/useReminders'
import { useProjectThemeQuery } from '@/features/theme-settings/useProjectTheme'
import { useUpdateProject } from '@/features/dashboard/useProjects'
import { useAuth } from '@/contexts/AuthContext'
import { isHtmlEmpty } from '@/lib/html'

function formatDate(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y.slice(2)}`
}

const STAT_CARD_VARIANTS = {
  hidden: { opacity: 0, y: 10 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.25, delay: i * 0.05 } }),
}

export function OverviewPage() {
  const { project } = useOutletContext<{ project: Project }>()
  const { data: modules } = useGddModules(project.id)
  const { data: invTypes } = useInventoryTypes(project.id)
  const { data: invItems } = useAllInventoryItems(project.id)
  const { data: columns } = useKanbanColumns(project.id)
  const { data: cards } = useKanbanCards(project.id)
  const { data: ideas } = useIdeas(project.id)
  const { data: reminders } = useReminders(project.id)
  const { data: theme } = useProjectThemeQuery(project.id)
  const updateProject = useUpdateProject(project.id)
  const { user } = useAuth()
  const displayName = ((user?.user_metadata?.display_name as string | undefined) || user?.email?.split('@')[0]) ?? ''

  const moduleStats = useMemo(() => {
    const total = modules?.length ?? 0
    const filled = modules?.filter((m) => !isHtmlEmpty(m.content)).length ?? 0
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

  const today = new Date().toISOString().slice(0, 10)

  const upcomingCards = useMemo(
    () =>
      (cards ?? [])
        .filter((c) => c.due_date)
        .map((c) => ({ kind: 'card' as const, id: c.id, title: c.title, date: c.due_date! }))
        .sort((a, b) => (a.date < b.date ? -1 : 1)),
    [cards],
  )

  const upcomingReminders = useMemo(
    () =>
      (reminders ?? [])
        .filter((r) => r.event_date >= today)
        .map((r) => ({ kind: 'reminder' as const, id: r.id, title: r.title, date: r.event_date }))
        .sort((a, b) => (a.date < b.date ? -1 : 1)),
    [reminders, today],
  )

  const upcoming = useMemo(
    () => [...upcomingCards, ...upcomingReminders].sort((a, b) => (a.date < b.date ? -1 : 1)).slice(0, 6),
    [upcomingCards, upcomingReminders],
  )

  const overdueReminders = (reminders ?? []).filter((r) => r.event_date < today).length
  const todayReminders = (reminders ?? []).filter((r) => r.event_date === today).length

  const todoCount = useMemo(() => {
    if (!columns || columns.length === 0) return cards?.length ?? 0
    const doneColumnId = [...columns].sort((a, b) => a.sort_order - b.sort_order).at(-1)?.id
    return (cards ?? []).filter((c) => c.column_id !== doneColumnId).length
  }, [columns, cards])

  const statCards = [
    {
      icon: BookText,
      accent: 'bg-accent-yellow',
      label: 'Módulos de GDD',
      value: moduleStats.filled,
      suffix: `/${moduleStats.total}`,
      hint: 'preenchidos',
    },
    {
      icon: Boxes,
      accent: 'bg-accent-blue',
      label: 'Itens no inventário',
      value: invItems?.length ?? 0,
      hint: `em ${invTypes?.length ?? 0} tipos`,
    },
    {
      icon: KanbanSquare,
      accent: 'bg-accent-green',
      label: 'Cards no kanban',
      value: cards?.length ?? 0,
      hint: `em ${columns?.length ?? 0} colunas`,
    },
    {
      icon: Lightbulb,
      accent: 'bg-accent-purple',
      label: 'Ideias',
      value: ideas?.length ?? 0,
      hint: `${(ideas ?? []).filter((i) => i.status === 'approved').length} aprovadas`,
    },
  ]

  return (
    <div>
      {displayName && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="mb-3 text-sm text-canvas-fg/70"
        >
          Olá, <span className="font-semibold text-canvas-fg">{displayName}</span> — você ainda tem{' '}
          <span className="inline-flex items-center gap-1 font-semibold text-accent-green">
            <ListTodo size={13} className="inline" /> {todoCount} tarefa(s)
          </span>{' '}
          a fazer{todayReminders > 0 && (
            <>
              {' '}e hoje tem{' '}
              <span className="inline-flex items-center gap-1 font-semibold text-accent-yellow">
                <Bell size={13} className="inline" /> {todayReminders} lembrete(s)
              </span>
            </>
          )}
          .
        </motion.p>
      )}

      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="mb-6 border-2 border-line bg-surface p-5 shadow-brutal-sm"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-display text-2xl" style={{ color: 'var(--project-primary)' }}>
              {project.name}
            </h1>
            {project.description && <p className="mt-1 max-w-xl text-sm text-canvas-fg/60">{project.description}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {project.primary_genre && <Badge accent="blue">{project.primary_genre}</Badge>}
            {project.secondary_genre && <Badge accent="purple">{project.secondary_genre}</Badge>}
            <Select
              value={project.status}
              onChange={(e) => updateProject.mutate({ status: e.target.value })}
              className="text-label h-auto w-auto border-2 border-line bg-accent-yellow px-2 py-0.5 text-[10px] font-semibold text-ink"
            >
              {PHASES.filter((p) => p.value !== 'all').map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat, i) => (
          <motion.div key={stat.label} custom={i} initial="hidden" animate="show" variants={STAT_CARD_VARIANTS}>
            <Card className="h-full">
              <div className={`mb-3 inline-flex border-2 border-line p-1.5 text-ink ${stat.accent}`}>
                <stat.icon size={16} />
              </div>
              <p className="text-display text-3xl">
                {stat.value}
                {stat.suffix && <span className="text-lg text-canvas-fg/40">{stat.suffix}</span>}
              </p>
              <p className="text-label mt-1 text-[10px] text-canvas-fg/50">{stat.label}</p>
              <p className="text-[11px] text-canvas-fg/40">{stat.hint}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {[
          { title: 'Módulos por fase', points: moduleStats.byPhase, delay: 0 },
          { title: 'Inventário por tipo', points: inventoryByType, delay: 0.05 },
          { title: 'Cards por coluna', points: cardsByColumn, delay: 0.1 },
          { title: 'Ideias por status', points: ideasByStatus, delay: 0.15 },
        ].map(({ title, points, delay }) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.2 + delay }}
          >
            <Card>
              <h2 className="text-display mb-3 text-sm">{title}</h2>
              {points.length > 0 ? (
                <MiniBarChart points={points} colors={theme?.chart_colors} />
              ) : (
                <p className="text-xs text-canvas-fg/40">Nada por aqui ainda.</p>
              )}
            </Card>
          </motion.div>
        ))}
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.4 }}>
        <Card className="mt-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-display flex items-center gap-2 text-sm">
              <CalendarClock size={16} /> Próximos prazos e lembretes
            </h2>
            {overdueReminders > 0 && (
              <span className="text-label flex items-center gap-1 text-[10px] text-accent-red">
                <AlertTriangle size={11} /> {overdueReminders} lembrete(s) atrasado(s)
              </span>
            )}
          </div>
          {upcoming.length === 0 ? (
            <p className="text-xs text-canvas-fg/40">Nada agendado por enquanto.</p>
          ) : (
            <ul className="space-y-1.5">
              {upcoming.map((item) => {
                const overdue = item.date < today
                return (
                  <li key={`${item.kind}-${item.id}`} className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex items-center gap-2 truncate text-canvas-fg/80">
                      {item.kind === 'reminder' ? (
                        <Bell size={12} className="shrink-0 text-accent-purple" />
                      ) : (
                        <KanbanSquare size={12} className="shrink-0 text-accent-green" />
                      )}
                      {item.title}
                    </span>
                    <span
                      className={`text-label flex shrink-0 items-center gap-1 text-[11px] ${overdue ? 'text-accent-red' : 'text-canvas-fg/50'}`}
                    >
                      {overdue && <AlertTriangle size={11} />}
                      {formatDate(item.date)}
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
      </motion.div>
    </div>
  )
}
