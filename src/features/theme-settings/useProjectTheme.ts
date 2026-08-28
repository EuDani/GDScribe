import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ASSETS_BUCKET, supabase } from '@/lib/supabase'
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
  return useMutation({
    mutationFn: async (changes: Partial<ProjectTheme>) => {
      const { error } = await supabase
        .from('project_themes')
        .update(changes)
        .eq('project_id', projectId)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['project_theme', projectId] }),
  })
}

export async function uploadProjectAsset(
  projectId: string,
  file: File,
  kind: 'logo' | 'cover',
) {
  const ext = file.name.split('.').pop()
  const path = `${projectId}/${kind}-${Date.now()}.${ext}`
  const { error } = await supabase.storage.from(ASSETS_BUCKET).upload(path, file, {
    upsert: true,
  })
  if (error) throw error
  const { data } = supabase.storage.from(ASSETS_BUCKET).getPublicUrl(path)
  return data.publicUrl
}
