import { Bell } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { REMINDER_IMPORTANCE, isReminderOverdue } from '@/lib/types'
import { useAllReminders } from '@/features/reminders/useReminders'

function formatDate(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y.slice(2)}`
}

/** Resumo dos lembretes de todos os projetos, ordenados, na tela inicial. */
export function AllProjectsCalendarCard() {
  const { data: reminders, isLoading } = useAllReminders()
  const today = new Date().toISOString().slice(0, 10)
  const upcoming = (reminders ?? [])
    .filter((r) => r.event_date >= today || isReminderOverdue(r))
    .sort((a, b) => (a.event_date < b.event_date ? -1 : 1))
    .slice(0, 8)

  if (isLoading || upcoming.length === 0) return null

  return (
    <Card className="mb-8">
      <h2 className="text-display mb-3 flex items-center gap-2 text-sm">
        <Bell size={15} /> Lembretes de todos os projetos
      </h2>
      <ul className="space-y-1.5">
        {upcoming.map((r) => {
          const overdue = isReminderOverdue(r)
          const imp = REMINDER_IMPORTANCE.find((i) => i.value === r.importance)
          return (
            <li key={r.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-2 truncate text-canvas-fg/80">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: imp?.color }} />
                <span className="truncate">{r.title}</span>
                {r.projects?.name && (
                  <Link
                    to={`/project/${r.project_id}/calendar`}
                    className="text-label shrink-0 text-[10px] text-canvas-fg/40 hover:text-accent-yellow hover:underline"
                  >
                    {r.projects.name}
                  </Link>
                )}
              </span>
              <span
                className={`text-label flex shrink-0 items-center gap-1 text-[11px] ${overdue ? 'text-accent-red' : 'text-canvas-fg/50'}`}
              >
                {formatDate(r.event_date)}
              </span>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
