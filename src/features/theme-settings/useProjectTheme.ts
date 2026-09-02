import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/contexts/ToastContext'
import type { ProjectTheme } from '@/lib/types'

export function useProjectThemeQuery(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project_theme', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_themes')
        .select('*')
        .eq('project_id', projectId)
        .single()
      if (error) throw error
      return data as ProjectTheme
    },
    enabled: Boolean(projectId),
  })
}

export function useUpdateProjectTheme(projectId: string) {
  const queryClient = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: async (changes: Partial<ProjectTheme>) => {
      const { error } = await supabase
        .from('project_themes')
        .update(changes)
        .eq('project_id', projectId)
      if (error) throw error
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Erro desconhecido'
      toast.error(`Falha ao salvar o tema: ${message}`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['project_theme', projectId] }),
  })
}
