import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Flowchart, FlowchartEdge, FlowchartNode } from '@/lib/types'

export function useFlowcharts(projectId: string | undefined) {
  return useQuery({
    queryKey: ['flowcharts', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('flowcharts')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true })
      if (error) throw error
      return data as Flowchart[]
    },
    enabled: Boolean(projectId),
  })
}

export function useCreateFlowchart(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => {
      const existing = queryClient.getQueryData<Flowchart[]>(['flowcharts', projectId]) ?? []
      const { data, error } = await supabase
        .from('flowcharts')
        .insert({ project_id: projectId, name, sort_order: existing.length })
        .select('*')
        .single()
      if (error) throw error
      return data as Flowchart
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['flowcharts', projectId] }),
  })
}

export function useRenameFlowchart(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from('flowcharts').update({ name }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['flowcharts', projectId] }),
  })
}

export function useDeleteFlowchart(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('flowcharts').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['flowcharts', projectId] }),
  })
}

export function useUpdateFlowchartContent(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, nodes, edges }: { id: string; nodes: FlowchartNode[]; edges: FlowchartEdge[] }) => {
      const { error } = await supabase.from('flowcharts').update({ nodes, edges }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['flowcharts', projectId] }),
  })
}
