import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Reminder } from '@/lib/types'

export function useReminders(projectId: string | undefined) {
  return useQuery({
    queryKey: ['reminders', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('project_id', projectId)
        .order('event_date', { ascending: true })
      if (error) throw error
      return data as Reminder[]
    },
    enabled: Boolean(projectId),
    // os lembretes de hoje disparam notificação — vale a pena reconferir com frequência
    refetchInterval: 60_000,
  })
}

type ReminderInput = Pick<
  Reminder,
  'title' | 'event_date' | 'event_time' | 'notes' | 'notifications' | 'tags' | 'image_url' | 'importance'
>

export function useCreateReminder(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: ReminderInput) => {
      const { error } = await supabase.from('reminders').insert({ project_id: projectId, ...input })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reminders', projectId] }),
  })
}

export function useUpdateReminder(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...changes }: Partial<ReminderInput> & { id: string }) => {
      const { error } = await supabase.from('reminders').update(changes).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reminders', projectId] }),
  })
}

export function useDeleteReminder(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('reminders').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reminders', projectId] }),
  })
}
