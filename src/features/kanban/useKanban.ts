import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { KanbanCard, KanbanColumn } from '@/lib/types'

export function useKanbanColumns(projectId: string | undefined) {
  return useQuery({
    queryKey: ['kanban_columns', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kanban_columns')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true })
      if (error) throw error
      return data as KanbanColumn[]
    },
    enabled: Boolean(projectId),
  })
}

export function useKanbanCards(projectId: string | undefined) {
  return useQuery({
    queryKey: ['kanban_cards', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kanban_cards')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true })
      if (error) throw error
      return data as KanbanCard[]
    },
    enabled: Boolean(projectId),
  })
}

export function useCreateColumn(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      const existing = queryClient.getQueryData<KanbanColumn[]>(['kanban_columns', projectId]) ?? []
      const { error } = await supabase
        .from('kanban_columns')
        .insert({ project_id: projectId, name, color, sort_order: existing.length })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kanban_columns', projectId] }),
  })
}

export function useDeleteColumn(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('kanban_columns').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban_columns', projectId] })
      queryClient.invalidateQueries({ queryKey: ['kanban_cards', projectId] })
    },
  })
}

export function useCreateCard(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      columnId,
      title,
      description,
    }: {
      columnId: string
      title: string
      description: string
    }) => {
      const existing = queryClient.getQueryData<KanbanCard[]>(['kanban_cards', projectId]) ?? []
      const columnCards = existing.filter((c) => c.column_id === columnId)
      const { error } = await supabase.from('kanban_cards').insert({
        project_id: projectId,
        column_id: columnId,
        title,
        description: description || null,
        tags: [],
        sort_order: columnCards.length,
      })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kanban_cards', projectId] }),
  })
}

export function useUpdateCard(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...changes }: Partial<KanbanCard> & { id: string }) => {
      const { error } = await supabase.from('kanban_cards').update(changes).eq('id', id)
      if (error) throw error
    },
    onMutate: async (updated) => {
      await queryClient.cancelQueries({ queryKey: ['kanban_cards', projectId] })
      const previous = queryClient.getQueryData<KanbanCard[]>(['kanban_cards', projectId])
      queryClient.setQueryData<KanbanCard[]>(['kanban_cards', projectId], (old) =>
        old?.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)),
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['kanban_cards', projectId], context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['kanban_cards', projectId] }),
  })
}

export function useMoveCards(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (updates: { id: string; column_id: string; sort_order: number }[]) => {
      await Promise.all(
        updates.map((u) =>
          supabase
            .from('kanban_cards')
            .update({ column_id: u.column_id, sort_order: u.sort_order })
            .eq('id', u.id),
        ),
      )
    },
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: ['kanban_cards', projectId] })
      const previous = queryClient.getQueryData<KanbanCard[]>(['kanban_cards', projectId])
      queryClient.setQueryData<KanbanCard[]>(['kanban_cards', projectId], (old) =>
        old?.map((c) => {
          const update = updates.find((u) => u.id === c.id)
          return update ? { ...c, column_id: update.column_id, sort_order: update.sort_order } : c
        }),
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['kanban_cards', projectId], context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['kanban_cards', projectId] }),
  })
}

export function useDeleteCard(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('kanban_cards').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kanban_cards', projectId] }),
  })
}
