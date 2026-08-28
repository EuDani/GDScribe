import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, TextInput, Textarea } from '@/components/ui/Input'
import { NotificationRulesEditor } from '@/features/reminders/NotificationRulesEditor'
import { ensureNotificationPermission, isNotificationSupported } from '@/lib/notifications'
import type { NotificationRule, Reminder } from '@/lib/types'
import {
  useCreateReminder,
  useDeleteReminder,
  useUpdateReminder,
} from '@/features/reminders/useReminders'
import { useToast } from '@/contexts/ToastContext'

export function ReminderModal({
  projectId,
  open,
  onClose,
  reminder,
  defaultDate,
}: {
  projectId: string
  open: boolean
  onClose: () => void
  reminder?: Reminder | null
  defaultDate?: string
}) {
  const createReminder = useCreateReminder(projectId)
  const updateReminder = useUpdateReminder(projectId)
  const deleteReminder = useDeleteReminder(projectId)
  const toast = useToast()

  const [title, setTitle] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventTime, setEventTime] = useState('')
  const [notes, setNotes] = useState('')
  const [rules, setRules] = useState<NotificationRule[]>([])

  useEffect(() => {
    if (!open) return
    setTitle(reminder?.title ?? '')
    setEventDate(reminder?.event_date ?? defaultDate ?? '')
    setEventTime(reminder?.event_time ?? '')
    setNotes(reminder?.notes ?? '')
    setRules(reminder?.notifications ?? [])
  }, [open, reminder, defaultDate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !eventDate) return

    if (rules.length > 0 && isNotificationSupported()) {
      const granted = await ensureNotificationPermission()
      if (!granted) {
        toast.error('Permissão de notificação negada — o lembrete será salvo, mas não vai poder avisar via notificação do sistema.')
      }
    }

    const input = {
      title: title.trim(),
      event_date: eventDate,
      event_time: eventTime || null,
      notes: notes.trim() || null,
      notifications: rules,
    }

    if (reminder) await updateReminder.mutateAsync({ id: reminder.id, ...input })
    else await createReminder.mutateAsync(input)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={reminder ? 'Editar lembrete' : 'Novo lembrete'} wide>
      <form onSubmit={handleSubmit}>
        <Field label="Título">
          <TextInput required autoFocus value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>

        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Data">
            <TextInput type="date" required value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
          </Field>
          <Field label="Horário" hint="Opcional">
            <TextInput type="time" value={eventTime} onChange={(e) => setEventTime(e.target.value)} />
          </Field>
        </div>

        <Field label="Notas" hint="Opcional">
          <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

        <Field label="Notificações">
          <NotificationRulesEditor rules={rules} onChange={setRules} />
          {!isNotificationSupported() && (
            <p className="mt-2 text-xs text-canvas-fg/40">
              Seu navegador não suporta notificações do sistema.
            </p>
          )}
          {isNotificationSupported() && rules.length > 0 && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-canvas-fg/40">
              <Bell size={12} />
              Só dispara enquanto o GDScribe estiver aberto em alguma aba.
            </p>
          )}
        </Field>

        <div className="mt-4 flex justify-between gap-2">
          {reminder && (
            <Button
              type="button"
              variant="danger"
              onClick={async () => {
                await deleteReminder.mutateAsync(reminder.id)
                onClose()
              }}
            >
              Excluir
            </Button>
          )}
          <div className="ml-auto flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createReminder.isPending || updateReminder.isPending}>
              Salvar
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
