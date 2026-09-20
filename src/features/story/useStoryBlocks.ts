import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { StoryBlock } from '@/lib/types'

export function useStoryBlocks(projectId: string | undefined) {
  return useQuery({
    queryKey: ['story_blocks', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('story_blocks')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true })
      if (error) throw error
      return data as StoryBlock[]
    },
    enabled: Boolean(projectId),
  })
}

export function useCreateStoryBlock(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ title, parentId }: { title: string; parentId?: string | null }) => {
      const existing = queryClient.getQueryData<StoryBlock[]>(['story_blocks', projectId]) ?? []
      const siblings = existing.filter((b) => (b.parent_id ?? null) === (parentId ?? null))
      const { data, error } = await supabase
        .from('story_blocks')
        .insert({
          project_id: projectId,
          parent_id: parentId ?? null,
          title,
          content: '',
          sort_order: siblings.length,
        })
        .select('*')
        .single()
      if (error) throw error
      return data as StoryBlock
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['story_blocks', projectId] }),
  })
}

export function useUpdateStoryBlock(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...changes }: Partial<StoryBlock> & { id: string }) => {
      const { error } = await supabase.from('story_blocks').update(changes).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['story_blocks', projectId] }),
  })
}

export function useDeleteStoryBlock(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('story_blocks').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['story_blocks', projectId] }),
  })
}

export function useReorderStoryBlocks(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (blocks: { id: string; sort_order: number }[]) => {
      await Promise.all(
        blocks.map((b) => supabase.from('story_blocks').update({ sort_order: b.sort_order }).eq('id', b.id)),
      )
    },
    onMutate: async (blocks) => {
      await queryClient.cancelQueries({ queryKey: ['story_blocks', projectId] })
      const previous = queryClient.getQueryData<StoryBlock[]>(['story_blocks', projectId])
      queryClient.setQueryData<StoryBlock[]>(['story_blocks', projectId], (old) =>
        old
          ?.map((b) => {
            const update = blocks.find((u) => u.id === b.id)
            return update ? { ...b, sort_order: update.sort_order } : b
          })
          .sort((a, b) => a.sort_order - b.sort_order),
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['story_blocks', projectId], context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['story_blocks', projectId] }),
  })
}

export function useReparentStoryBlocks(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (updates: { id: string; parent_id: string | null; sort_order: number }[]) => {
      await Promise.all(
        updates.map((b) =>
          supabase.from('story_blocks').update({ parent_id: b.parent_id, sort_order: b.sort_order }).eq('id', b.id),
        ),
      )
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['story_blocks', projectId] }),
  })
}
