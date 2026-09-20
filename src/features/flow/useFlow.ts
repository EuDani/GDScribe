import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { FlowTask } from '@/lib/types'

export function useFlowTasks(projectId: string | undefined) {
  return useQuery({
    queryKey: ['flow_tasks', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('flow_tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('queue_order', { ascending: true })
      if (error) throw error
      return data as FlowTask[]
    },
    enabled: Boolean(projectId),
    // O cronômetro da tarefa em foco depende de active_since — refaz o
    // cálculo de tempo ao vivo mesmo sem nenhuma mutação disparar.
    refetchInterval: 30_000,
  })
}

type NewFlowTaskInput = {
  title: string
  description: string | null
} & Partial<
  Pick<
    FlowTask,
    'priority' | 'sectors' | 'desired_date' | 'start_date' | 'checklists' | 'version_label' | 'logs' | 'state'
  >
>

export function useCreateFlowTask(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ title, description, state, ...rest }: NewFlowTaskInput) => {
      const existing = queryClient.getQueryData<FlowTask[]>(['flow_tasks', projectId]) ?? []
      const targetState = state ?? 'queued'
      const count = existing.filter((t) => t.state === targetState).length
      const { error } = await supabase.from('flow_tasks').insert({
        project_id: projectId,
        title,
        description: description || null,
        state: targetState,
        queue_order: count,
        // pré-preenche com hoje — o usuário ajusta se o trabalho começar depois
        start_date: new Date().toISOString().slice(0, 10),
        logs: [{ id: crypto.randomUUID(), message: 'Tarefa criada', created_at: new Date().toISOString() }],
        ...rest,
      })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['flow_tasks', projectId] }),
  })
}

/** Update de uma única tarefa (edição de campos), com update otimista. */
export function useUpdateFlowTask(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...changes }: Partial<FlowTask> & { id: string }) => {
      const { error } = await supabase.from('flow_tasks').update(changes).eq('id', id)
      if (error) throw error
    },
    onMutate: async (updated) => {
      await queryClient.cancelQueries({ queryKey: ['flow_tasks', projectId] })
      const previous = queryClient.getQueryData<FlowTask[]>(['flow_tasks', projectId])
      queryClient.setQueryData<FlowTask[]>(['flow_tasks', projectId], (old) =>
        old?.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)),
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['flow_tasks', projectId], context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['flow_tasks', projectId] }),
  })
}

/** Update em lote — usado pra trocas de foco, pausas, drag&drop e reordenação,
 * onde vários registros mudam de estado/ordem numa única operação lógica. */
export function useBulkUpdateFlowTasks(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (updates: (Partial<FlowTask> & { id: string })[]) => {
      await Promise.all(updates.map(({ id, ...changes }) => supabase.from('flow_tasks').update(changes).eq('id', id)))
    },
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: ['flow_tasks', projectId] })
      const previous = queryClient.getQueryData<FlowTask[]>(['flow_tasks', projectId])
      queryClient.setQueryData<FlowTask[]>(['flow_tasks', projectId], (old) =>
        old?.map((t) => {
          const update = updates.find((u) => u.id === t.id)
          return update ? { ...t, ...update } : t
        }),
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['flow_tasks', projectId], context.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['flow_tasks', projectId] }),
  })
}

export function useDeleteFlowTask(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('flow_tasks').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['flow_tasks', projectId] }),
  })
}
