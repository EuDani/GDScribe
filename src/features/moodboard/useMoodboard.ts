import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { MoodboardFolder, MoodboardImage } from '@/lib/types'

export function useMoodboardFolders(projectId: string | undefined) {
  return useQuery({
    queryKey: ['moodboard_folders', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('moodboard_folders')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true })
      if (error) throw error
      return data as MoodboardFolder[]
    },
    enabled: Boolean(projectId),
  })
}

export function useCreateMoodboardFolder(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ name, parentId }: { name: string; parentId?: string | null }) => {
      const existing = queryClient.getQueryData<MoodboardFolder[]>(['moodboard_folders', projectId]) ?? []
      const siblings = existing.filter((f) => (f.parent_id ?? null) === (parentId ?? null))
      const { data, error } = await supabase
        .from('moodboard_folders')
        .insert({ project_id: projectId, parent_id: parentId ?? null, name, sort_order: siblings.length })
        .select('*')
        .single()
      if (error) throw error
      return data as MoodboardFolder
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['moodboard_folders', projectId] }),
  })
}

export function useReorderMoodboardFolders(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (folders: { id: string; sort_order: number }[]) => {
      await Promise.all(
        folders.map((f) => supabase.from('moodboard_folders').update({ sort_order: f.sort_order }).eq('id', f.id)),
      )
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['moodboard_folders', projectId] }),
  })
}

export function useRenameMoodboardFolder(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from('moodboard_folders').update({ name }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['moodboard_folders', projectId] }),
  })
}

export function useMoveMoodboardFolder(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, parentId }: { id: string; parentId: string | null }) => {
      const { error } = await supabase.from('moodboard_folders').update({ parent_id: parentId }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['moodboard_folders', projectId] }),
  })
}

export function useDeleteMoodboardFolder(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('moodboard_folders').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moodboard_folders', projectId] })
      queryClient.invalidateQueries({ queryKey: ['moodboard_images', projectId] })
    },
  })
}

export function useMoodboardImages(projectId: string | undefined) {
  return useQuery({
    queryKey: ['moodboard_images', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('moodboard_images')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as MoodboardImage[]
    },
    enabled: Boolean(projectId),
  })
}

export function useAddMoodboardImages(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ urls, folderId }: { urls: string[]; folderId: string | null }) => {
      const { error } = await supabase
        .from('moodboard_images')
        .insert(urls.map((url) => ({ project_id: projectId, folder_id: folderId, image_url: url })))
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['moodboard_images', projectId] }),
  })
}

export function useUpdateMoodboardImage(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...changes }: Partial<MoodboardImage> & { id: string }) => {
      const { error } = await supabase.from('moodboard_images').update(changes).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['moodboard_images', projectId] }),
  })
}

export function useDeleteMoodboardImage(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('moodboard_images').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['moodboard_images', projectId] }),
  })
}
