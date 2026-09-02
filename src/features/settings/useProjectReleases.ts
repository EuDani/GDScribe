import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ProjectRelease } from '@/lib/types'

export function useProjectReleases(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project_releases', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_releases')
        .select('*')
        .eq('project_id', projectId)
        .order('release_date', { ascending: true })
      if (error) throw error
      return data as ProjectRelease[]
    },
    enabled: Boolean(projectId),
  })
}

type ReleaseInput = Pick<ProjectRelease, 'name' | 'version' | 'release_date' | 'notes'>

export function useCreateRelease(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: ReleaseInput) => {
      const { error } = await supabase.from('project_releases').insert({ project_id: projectId, ...input })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['project_releases', projectId] }),
  })
}

export function useUpdateRelease(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...changes }: Partial<ReleaseInput> & { id: string }) => {
      const { error } = await supabase.from('project_releases').update(changes).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['project_releases', projectId] }),
  })
}

export function useDeleteRelease(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('project_releases').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['project_releases', projectId] }),
  })
}
