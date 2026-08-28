import { useEffect } from 'react'
import { computeTriggerDate, fireNotification } from '@/lib/notifications'
import { useReminders } from '@/features/reminders/useReminders'

const FIRED_KEY = 'gdscribe.firedNotifications'
const FIRE_WINDOW_MS = 5 * 60_000

function getFiredSet(): Set<string> {
  try {
    const raw = localStorage.getItem(FIRED_KEY)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

function markFired(key: string) {
  const set = getFiredSet()
  set.add(key)
  localStorage.setItem(FIRED_KEY, JSON.stringify([...set].slice(-500)))
}

function formatWhen(reminder: { event_date: string; event_time: string | null }) {
  const [y, m, d] = reminder.event_date.split('-')
  return reminder.event_time
    ? `${d}/${m}/${y} às ${reminder.event_time}`
    : `${d}/${m}/${y}`
}

/** Roda em background enquanto o app está aberto e dispara notificações do
 * sistema quando o horário configurado de um lembrete chega. Não funciona
 * com o app fechado — é uma limitação de app estático sem push server. */
export function useReminderScheduler(projectId: string | undefined) {
  const { data: reminders } = useReminders(projectId)

  useEffect(() => {
    if (!reminders) return

    function check() {
      const now = Date.now()
      const fired = getFiredSet()
      for (const reminder of reminders ?? []) {
        for (const rule of reminder.notifications) {
          const key = `${reminder.id}:${rule.id}`
          if (fired.has(key)) continue
          const trigger = computeTriggerDate(reminder, rule)
          if (!trigger) continue
          const diff = now - trigger.getTime()
          if (diff >= 0 && diff < FIRE_WINDOW_MS) {
            fireNotification(`Lembrete: ${reminder.title}`, reminder.notes || formatWhen(reminder))
            markFired(key)
          }
        }
      }
    }

    check()
    const interval = setInterval(check, 30_000)
    return () => clearInterval(interval)
  }, [reminders])
}
