import type { NotificationRule, Reminder } from '@/lib/types'

const UNIT_MS: Record<'minutes' | 'hours' | 'days' | 'weeks', number> = {
  minutes: 60_000,
  hours: 60 * 60_000,
  days: 24 * 60 * 60_000,
  weeks: 7 * 24 * 60 * 60_000,
}

/** Data/hora em que uma regra de notificação deve disparar, ou null se a regra estiver incompleta. */
export function computeTriggerDate(reminder: Reminder, rule: NotificationRule): Date | null {
  if (rule.kind === 'same_day_at') {
    if (!rule.time) return null
    const [h, m] = rule.time.split(':').map(Number)
    const d = new Date(`${reminder.event_date}T00:00:00`)
    d.setHours(h, m, 0, 0)
    return d
  }

  if (rule.kind === 'before') {
    if (!rule.amount || !rule.unit) return null
    const eventMoment = new Date(`${reminder.event_date}T${reminder.event_time ?? '09:00'}:00`)
    return new Date(eventMoment.getTime() - rule.amount * UNIT_MS[rule.unit])
  }

  return null
}

export function isNotificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export function fireNotification(title: string, body: string) {
  if (!isNotificationSupported() || Notification.permission !== 'granted') return
  try {
    new Notification(title, { body, icon: `${import.meta.env.BASE_URL}favicon.svg` })
  } catch {
    // alguns navegadores mobile não suportam `new Notification` fora de um service worker — ignora
  }
}
