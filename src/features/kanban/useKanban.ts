import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { KanbanBoard, KanbanCard, KanbanColumn } from '@/lib/types'

export function useKanbanBoards(projectId: string | undefined) {
  return useQuery({
    queryKey: ['kanban_boards', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kanban_boards')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true })
      if (error) throw error
      return data as KanbanBoard[]
    },
    enabled: Boolean(projectId),
  })
}

export function useCreateBoard(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => {
      const existing = queryClient.getQueryData<KanbanBoard[]>(['kanban_boards', projectId]) ?? []
      const { data, error } = await supabase
        .from('kanban_boards')
        .insert({ project_id: projectId, name, sort_order: existing.length })
        .select('*')
        .single()
      if (error) throw error
      return data as KanbanBoard
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kanban_boards', projectId] }),
  })
}

export function useRenameBoard(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from('kanban_boards').update({ name }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kanban_boards', projectId] }),
  })
}

export function useDeleteBoard(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('kanban_boards').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kanban_boards', projectId] }),
  })
}

/** Todas as colunas do projeto, em todos os quadros — usado pelo Calendário/Visão Geral. */
export function useAllKanbanColumns(projectId: string | undefined) {
  return useQuery({
    queryKey: ['kanban_columns', projectId, 'all'],
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

/** Todos os cards do projeto, em todos os quadros — usado pelo Calendário/Visão Geral. */
export function useAllKanbanCards(projectId: string | undefined) {
  return useQuery({
    queryKey: ['kanban_cards', projectId, 'all'],
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

export function useKanbanColumns(projectId: string | undefined, boardId: string | undefined) {
  return useQuery({
    queryKey: ['kanban_columns', projectId, boardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kanban_columns')
        .select('*')
        .eq('project_id', projectId)
        .eq('board_id', boardId)
        .order('sort_order', { ascending: true })
      if (error) throw error
      return data as KanbanColumn[]
    },
    enabled: Boolean(projectId) && Boolean(boardId),
  })
}

export function useKanbanCards(projectId: string | undefined, boardId: string | undefined) {
  return useQuery({
    queryKey: ['kanban_cards', projectId, boardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kanban_cards')
        .select('*')
        .eq('project_id', projectId)
        .eq('board_id', boardId)
        .order('sort_order', { ascending: true })
      if (error) throw error
      return data as KanbanCard[]
    },
    enabled: Boolean(projectId) && Boolean(boardId),
  })
}

export function useCreateColumn(projectId: string, boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      const existing = queryClient.getQueryData<KanbanColumn[]>(['kanban_columns', projectId, boardId]) ?? []
      const { error } = await supabase
        .from('kanban_columns')
        .insert({ project_id: projectId, board_id: boardId, name, color, sort_order: existing.length })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kanban_columns', projectId, boardId] }),
  })
}

export function useUpdateColumn(projectId: string, boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...changes }: Partial<KanbanColumn> & { id: string }) => {
      const { error } = await supabase.from('kanban_columns').update(changes).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kanban_columns', projectId, boardId] }),
  })
}

export function useReorderColumns(projectId: string, boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (columns: { id: string; sort_order: number }[]) => {
      await Promise.all(
        columns.map((c) => supabase.from('kanban_columns').update({ sort_order: c.sort_order }).eq('id', c.id)),
      )
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kanban_columns', projectId, boardId] }),
  })
}

export function useDeleteColumn(projectId: string, boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('kanban_columns').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban_columns', projectId, boardId] })
      queryClient.invalidateQueries({ queryKey: ['kanban_cards', projectId, boardId] })
    },
  })
}

type NewCardInput = {
  columnId: string
  title: string
  description: string | null
} & Partial<
  Pick<
    KanbanCard,
    | 'tags'
    | 'icon'
    | 'cover_image_url'
    | 'checklist'
    | 'extra_fields'
    | 'start_date'
    | 'due_date'
    | 'sectors'
    | 'estimated_hours'
    | 'hours_per_day'
  >
>

export function useCreateCard(projectId: string, boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ columnId, title, description, ...rest }: NewCardInput) => {
      const existing = queryClient.getQueryData<KanbanCard[]>(['kanban_cards', projectId, boardId]) ?? []
      const columnCards = existing.filter((c) => c.column_id === columnId)
      const { error } = await supabase.from('kanban_cards').insert({
        project_id: projectId,
        board_id: boardId,
        column_id: columnId,
        title,
        description: description || null,
        tags: [],
        sort_order: columnCards.length,
        ...rest,
      })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kanban_cards', projectId, boardId] }),
  })
}

export function useUpdateCard(projectId: string, boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...changes }: Partial<KanbanCard> & { id: string }) => {
      const { error } = await supabase.from('kanban_cards').update(changes).eq('id', id)
      if (error) throw error
    },
    onMutate: async (updated) => {
      await queryClient.cancelQueries({ queryKey: ['kanban_cards', projectId, boardId] })
      const previous = queryClient.getQueryData<KanbanCard[]>(['kanban_cards', projectId, boardId])
      queryClient.setQueryData<KanbanCard[]>(['kanban_cards', projectId, boardId], (old) =>
        old?.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)),
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['kanban_cards', projectId, boardId], context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['kanban_cards', projectId, boardId] }),
  })
}

export function useMoveCards(projectId: string, boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (
      updates: { id: string; column_id: string; sort_order: number; completed_at?: string | null }[],
    ) => {
      await Promise.all(
        updates.map((u) =>
          supabase
            .from('kanban_cards')
            .update({
              column_id: u.column_id,
              sort_order: u.sort_order,
              ...(u.completed_at !== undefined ? { completed_at: u.completed_at } : {}),
            })
            .eq('id', u.id),
        ),
      )
    },
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: ['kanban_cards', projectId, boardId] })
      const previous = queryClient.getQueryData<KanbanCard[]>(['kanban_cards', projectId, boardId])
      queryClient.setQueryData<KanbanCard[]>(['kanban_cards', projectId, boardId], (old) =>
        old?.map((c) => {
          const update = updates.find((u) => u.id === c.id)
          if (!update) return c
          return {
            ...c,
            column_id: update.column_id,
            sort_order: update.sort_order,
            completed_at: update.completed_at !== undefined ? update.completed_at : c.completed_at,
          }
        }),
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['kanban_cards', projectId, boardId], context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['kanban_cards', projectId, boardId] }),
  })
}

export function useDeleteCard(projectId: string, boardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('kanban_cards').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kanban_cards', projectId, boardId] }),
  })
}
