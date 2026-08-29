import { useEffect, useMemo, useRef, useState } from 'react'
import { Bell, Upload } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, Select, TextInput, Textarea } from '@/components/ui/Input'
import { TagInput } from '@/components/TagInput'
import { NotificationRulesEditor } from '@/features/reminders/NotificationRulesEditor'
import { ensureNotificationPermission, isNotificationSupported } from '@/lib/notifications'
import { useUploadImage } from '@/lib/useUploadImage'
import { REMINDER_IMPORTANCE, type NotificationRule, type Reminder, type ReminderImportance } from '@/lib/types'
import {
  useCreateReminder,
  useDeleteReminder,
  useReminders,
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
  const { data: allReminders } = useReminders(projectId)
  const toast = useToast()
  const { upload, uploading } = useUploadImage(projectId)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const allTags = useMemo(
    () => Array.from(new Set((allReminders ?? []).flatMap((r) => r.tags))).sort(),
    [allReminders],
  )

  const [title, setTitle] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventTime, setEventTime] = useState('')
  const [notes, setNotes] = useState('')
  const [rules, setRules] = useState<NotificationRule[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [importance, setImportance] = useState<ReminderImportance>('normal')

  useEffect(() => {
    if (!open) return
    setTitle(reminder?.title ?? '')
    setEventDate(reminder?.event_date ?? defaultDate ?? '')
    setEventTime(reminder?.event_time ?? '')
    setNotes(reminder?.notes ?? '')
    setRules(reminder?.notifications ?? [])
    setTags(reminder?.tags ?? [])
    setImageUrl(reminder?.image_url ?? null)
    setImportance(reminder?.importance ?? 'normal')
  }, [open, reminder, defaultDate])

  async function handleImageUpload(file: File) {
    const url = await upload(file, 'reminder-images')
    if (url) setImageUrl(url)
  }

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
      tags,
      image_url: imageUrl,
      importance,
    }

    if (reminder) await updateReminder.mutateAsync({ id: reminder.id, ...input })
    else await createReminder.mutateAsync(input)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={reminder ? 'Editar lembrete' : 'Novo lembrete'}
      wide
      isDirty={
        reminder
          ? title !== reminder.title ||
            eventDate !== reminder.event_date ||
            eventTime !== (reminder.event_time ?? '') ||
            notes !== (reminder.notes ?? '') ||
            JSON.stringify(tags) !== JSON.stringify(reminder.tags) ||
            imageUrl !== reminder.image_url ||
            importance !== reminder.importance ||
            JSON.stringify(rules) !== JSON.stringify(reminder.notifications)
          : Boolean(title.trim() || notes.trim() || rules.length > 0 || tags.length > 0 || imageUrl)
      }
    >
      <form onSubmit={handleSubmit}>
        <Field label="Título">
          <TextInput required autoFocus value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>

        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Data">
            <TextInput type="date" required value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
          </Field>
          <Field label="Horário" hint="Opcional">
            <TextInput type="time" value={eventTime} onChange={(e) => setEventTime(e.target.value)} />
          </Field>
          <Field label="Importância">
            <Select value={importance} onChange={(e) => setImportance(e.target.value as ReminderImportance)}>
              {REMINDER_IMPORTANCE.map((i) => (
                <option key={i.value} value={i.value}>
                  {i.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Tags">
          <TagInput value={tags} onChange={setTags} suggestions={allTags} placeholder="marketing, build, reunião…" />
        </Field>

        <Field label="Imagem" hint="Opcional">
          <div className="flex items-center gap-3">
            {imageUrl && <img src={imageUrl} alt="" className="h-14 w-24 border-2 border-line object-cover" />}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleImageUpload(file)
                e.target.value = ''
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              icon={<Upload size={12} />}
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? 'Enviando…' : 'Enviar imagem'}
            </Button>
            {imageUrl && (
              <button
                type="button"
                onClick={() => setImageUrl(null)}
                className="text-label text-[11px] text-canvas-fg/40 underline hover:text-canvas-fg"
              >
                remover
              </button>
            )}
          </div>
        </Field>

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
