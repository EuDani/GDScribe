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
      const { data, error } = await supabase
        .from('game_references')
        .insert({ project_id: projectId, title })
        .select('*')
        .single()
      if (error) throw error
      return data as GameReference
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['game_references', projectId] }),
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
