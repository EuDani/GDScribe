import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ProjectSector } from '@/lib/types'

const SECTOR_COLORS = ['#ff3b30', '#0a84ff', '#ffd60a', '#30d158', '#bf5af2']

export function useProjectSectors(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project_sectors', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_sectors')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true })
      if (error) throw error
      return data as ProjectSector[]
    },
    enabled: Boolean(projectId),
  })
}

export function useCreateSector(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => {
      const existing = queryClient.getQueryData<ProjectSector[]>(['project_sectors', projectId]) ?? []
      const { data, error } = await supabase
        .from('project_sectors')
        .insert({
          project_id: projectId,
          name,
          color: SECTOR_COLORS[existing.length % SECTOR_COLORS.length],
          sort_order: existing.length,
        })
        .select('*')
        .single()
      if (error) throw error
      return data as ProjectSector
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['project_sectors', projectId] }),
  })
}

export function useRenameSector(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from('project_sectors').update({ name }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['project_sectors', projectId] }),
  })
}

export function useDeleteSector(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('project_sectors').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['project_sectors', projectId] }),
  })
}

export function useReorderSectors(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (sectors: { id: string; sort_order: number }[]) => {
      await Promise.all(
        sectors.map((s) => supabase.from('project_sectors').update({ sort_order: s.sort_order }).eq('id', s.id)),
      )
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['project_sectors', projectId] }),
  })
}
