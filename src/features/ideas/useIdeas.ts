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
        .order('sort_order', { ascending: true })
      if (error) throw error
      return data as Idea[]
    },
    enabled: Boolean(projectId),
  })
}

export function useCreateIdea(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      title,
      body,
      tags,
      sectors,
    }: {
      title: string
      body: string
      tags: string[]
      sectors?: string[]
    }) => {
      const existing = queryClient.getQueryData<Idea[]>(['ideas', projectId]) ?? []
      const { error } = await supabase.from('ideas').insert({
        project_id: projectId,
        title,
        body: body || null,
        tags,
        sectors: sectors ?? [],
        status: 'new' as IdeaStatus,
        sort_order: existing.length,
      })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ideas', projectId] }),
  })
}

export function useReorderIdeas(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (ideas: { id: string; sort_order: number }[]) => {
      await Promise.all(
        ideas.map((i) => supabase.from('ideas').update({ sort_order: i.sort_order }).eq('id', i.id)),
      )
    },
    onMutate: async (ideas) => {
      await queryClient.cancelQueries({ queryKey: ['ideas', projectId] })
      const previous = queryClient.getQueryData<Idea[]>(['ideas', projectId])
      queryClient.setQueryData<Idea[]>(['ideas', projectId], (old) =>
        old
          ?.map((i) => {
            const update = ideas.find((u) => u.id === i.id)
            return update ? { ...i, sort_order: update.sort_order } : i
          })
          .sort((a, b) => a.sort_order - b.sort_order),
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['ideas', projectId], context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['ideas', projectId] }),
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
