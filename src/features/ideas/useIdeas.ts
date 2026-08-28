import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Idea, IdeaStatus } from '@/lib/types'

export function useIdeas(projectId: string | undefined) {
  return useQuery({
    queryKey: ['ideas', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ideas')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Idea[]
    },
    enabled: Boolean(projectId),
  })
}

export function useCreateIdea(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ title, body, tags }: { title: string; body: string; tags: string[] }) => {
      const { error } = await supabase.from('ideas').insert({
        project_id: projectId,
        title,
        body: body || null,
        tags,
        status: 'new' as IdeaStatus,
      })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ideas', projectId] }),
  })
}

export function useUpdateIdea(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...changes }: Partial<Idea> & { id: string }) => {
      const { error } = await supabase.from('ideas').update(changes).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ideas', projectId] }),
  })
}

export function useDeleteIdea(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ideas').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ideas', projectId] }),
  })
}
