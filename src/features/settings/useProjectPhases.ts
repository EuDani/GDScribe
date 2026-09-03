import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ProjectPhase } from '@/lib/types'

function slugifyKey(label: string) {
  return (
    label
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/(^_|_$)/g, '') || `fase_${Date.now()}`
  )
}

export function useProjectPhases(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project_phases', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_phases')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true })
      if (error) throw error
      return data as ProjectPhase[]
    },
    enabled: Boolean(projectId),
  })
}

export function useCreatePhase(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (label: string) => {
      const existing = queryClient.getQueryData<ProjectPhase[]>(['project_phases', projectId]) ?? []
      const { data, error } = await supabase
        .from('project_phases')
        .insert({
          project_id: projectId,
          key: `${slugifyKey(label)}_${crypto.randomUUID().slice(0, 4)}`,
          label,
          sort_order: existing.length,
        })
        .select('*')
        .single()
      if (error) throw error
      return data as ProjectPhase
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['project_phases', projectId] }),
  })
}

export function useRenamePhase(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, label }: { id: string; label: string }) => {
      const { error } = await supabase.from('project_phases').update({ label }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['project_phases', projectId] }),
  })
}

export function useDeletePhase(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('project_phases').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['project_phases', projectId] }),
  })
}

export function useReorderPhases(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (phases: { id: string; sort_order: number }[]) => {
      await Promise.all(
        phases.map((p) => supabase.from('project_phases').update({ sort_order: p.sort_order }).eq('id', p.id)),
      )
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['project_phases', projectId] }),
  })
}
