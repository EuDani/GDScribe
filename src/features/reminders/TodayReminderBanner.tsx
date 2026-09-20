import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Bell, X } from 'lucide-react'
import { toISODate } from '@/lib/dateUtils'
import { useReminders } from '@/features/reminders/useReminders'

const DISMISS_KEY = 'gdscribe.dismissedReminders'

function getDismissed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(DISMISS_KEY) ?? '[]')
  } catch {
    return []
  }
}

export function TodayReminderBanner({ projectId }: { projectId: string }) {
  const { data: reminders } = useReminders(projectId)
  const [dismissed, setDismissed] = useState<string[]>(getDismissed)

  const todayIso = toISODate(new Date())
  const todays = (reminders ?? []).filter((r) => r.event_date === todayIso && !dismissed.includes(r.id))

  function dismiss(id: string) {
    const next = [...dismissed, id]
    setDismissed(next)
    localStorage.setItem(DISMISS_KEY, JSON.stringify(next))
  }

  if (todays.length === 0) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center p-3">
      <div className="pointer-events-auto w-full max-w-lg space-y-2">
        <AnimatePresence>
          {todays.map((reminder) => (
            <motion.div
              key={reminder.id}
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="flex items-center gap-2.5 border-2 border-line bg-accent-yellow px-3 py-2.5 text-ink shadow-brutal-sm"
            >
              <Bell size={16} className="shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{reminder.title}</p>
                <p className="text-label text-[10px] opacity-70">
                  Hoje{reminder.event_time && ` às ${reminder.event_time}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => dismiss(reminder.id)}
                aria-label="Dispensar"
                className="shrink-0 cursor-pointer border-2 border-ink p-1 hover:bg-ink hover:text-accent-yellow"
              >
                <X size={13} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
