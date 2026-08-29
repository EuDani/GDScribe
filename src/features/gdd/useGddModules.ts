import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { GddModule, Phase } from '@/lib/types'

export function useGddModules(projectId: string | undefined) {
  return useQuery({
    queryKey: ['gdd_modules', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gdd_modules')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true })
      if (error) throw error
      return data as GddModule[]
    },
    enabled: Boolean(projectId),
  })
}

export function useCreateModule(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      title,
      phase,
      parentId,
    }: {
      title: string
      phase: Phase
      parentId?: string | null
    }) => {
      const modules = queryClient.getQueryData<GddModule[]>(['gdd_modules', projectId]) ?? []
      const key = `custom-${Date.now()}`
      const { data, error } = await supabase
        .from('gdd_modules')
        .insert({
          project_id: projectId,
          parent_id: parentId ?? null,
          key,
          title,
          icon: 'FileText',
          phase,
          sort_order: modules.length,
          is_custom: true,
          content: '',
        })
        .select('*')
        .single()
      if (error) throw error
      return data as GddModule
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gdd_modules', projectId] })
    },
  })
}

export function useUpdateModule(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...changes }: Partial<GddModule> & { id: string }) => {
      const { error } = await supabase.from('gdd_modules').update(changes).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gdd_modules', projectId] })
    },
  })
}

export function useReorderModules(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (modules: { id: string; sort_order: number }[]) => {
      await Promise.all(
        modules.map((m) => supabase.from('gdd_modules').update({ sort_order: m.sort_order }).eq('id', m.id)),
      )
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['gdd_modules', projectId] }),
  })
}

export function useDeleteModule(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('gdd_modules').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gdd_modules', projectId] })
    },
  })
}
