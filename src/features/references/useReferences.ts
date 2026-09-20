import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { GameReference } from '@/lib/types'

export function useReferences(projectId: string | undefined) {
  return useQuery({
    queryKey: ['game_references', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('game_references')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as GameReference[]
    },
    enabled: Boolean(projectId),
  })
}

export function useCreateReference(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (title: string) => {
      const existing = queryClient.getQueryData<GameReference[]>(['game_references', projectId]) ?? []
      const { data, error } = await supabase
        .from('game_references')
        .insert({ project_id: projectId, title, sort_order: existing.length })
        .select('*')
        .single()
      if (error) throw error
      return data as GameReference
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['game_references', projectId] }),
  })
}

export function useReorderReferences(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (refs: { id: string; sort_order: number }[]) => {
      await Promise.all(
        refs.map((r) => supabase.from('game_references').update({ sort_order: r.sort_order }).eq('id', r.id)),
      )
    },
    onMutate: async (refs) => {
      await queryClient.cancelQueries({ queryKey: ['game_references', projectId] })
      const previous = queryClient.getQueryData<GameReference[]>(['game_references', projectId])
      queryClient.setQueryData<GameReference[]>(['game_references', projectId], (old) =>
        old
          ?.map((r) => {
            const update = refs.find((u) => u.id === r.id)
            return update ? { ...r, sort_order: update.sort_order } : r
          })
          .sort((a, b) => a.sort_order - b.sort_order),
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['game_references', projectId], context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['game_references', projectId] }),
  })
}

export function useUpdateReference(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...changes }: Partial<GameReference> & { id: string }) => {
      const { error } = await supabase.from('game_references').update(changes).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['game_references', projectId] }),
  })
}

export function useDeleteReference(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('game_references').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['game_references', projectId] }),
  })
}
