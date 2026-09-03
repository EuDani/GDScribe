import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { DEFAULT_PHASES, type Project } from '@/lib/types'
import { useAuth } from '@/contexts/AuthContext'

const DEFAULT_MODULES: { key: string; title: string; icon: string; phase: string }[] = [
  { key: 'overview', title: 'Visão Geral', icon: 'Compass', phase: 'all' },
  { key: 'story', title: 'História & Universo', icon: 'BookOpen', phase: 'pre_production' },
  { key: 'core-loop', title: 'Core Loop', icon: 'RefreshCw', phase: 'pre_production' },
  { key: 'mechanics', title: 'Mecânicas', icon: 'Gamepad2', phase: 'production' },
  { key: 'level-design', title: 'Level Design', icon: 'Map', phase: 'production' },
  { key: 'art-direction', title: 'Direção de Arte', icon: 'Palette', phase: 'production' },
  { key: 'audio', title: 'Áudio', icon: 'Music', phase: 'production' },
  { key: 'release', title: 'Monetização & Lançamento', icon: 'Rocket', phase: 'post_production' },
]

const DEFAULT_COLUMNS = [
  { name: 'A Fazer', color: 'var(--color-accent-blue)' },
  { name: 'Em Progresso', color: 'var(--color-accent-yellow)' },
  { name: 'Concluído', color: 'var(--color-accent-green)' },
]

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'projeto'
  )
}

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false })
      if (error) throw error
      return data as Project[]
    },
  })
}

export function useProject(projectId: string | undefined) {
  return useQuery({
    queryKey: ['projects', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()
      if (error) throw error
      return data as Project
    },
    enabled: Boolean(projectId),
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({
      name,
      description,
      primaryGenre,
      secondaryGenre,
    }: {
      name: string
      description: string
      primaryGenre?: string
      secondaryGenre?: string
    }) => {
      if (!user) throw new Error('Não autenticado')

      const { data: project, error } = await supabase
        .from('projects')
        .insert({
          owner_id: user.id,
          name,
          slug: slugify(name),
          description: description || null,
          status: 'pre_production',
          primary_genre: primaryGenre || null,
          secondary_genre: secondaryGenre || null,
        })
        .select('*')
        .single()
      if (error) throw error

      const [, , boardResult] = await Promise.all([
        supabase.from('project_themes').insert({ project_id: project.id }),
        supabase.from('gdd_modules').insert(
          DEFAULT_MODULES.map((m, i) => ({
            project_id: project.id,
            key: m.key,
            title: m.title,
            icon: m.icon,
            phase: m.phase,
            sort_order: i,
            is_custom: false,
            content: '',
          })),
        ),
        supabase
          .from('kanban_boards')
          .insert({ project_id: project.id, name: 'Ações', sort_order: 0 })
          .select('*')
          .single(),
        supabase.from('project_phases').insert(
          DEFAULT_PHASES.map((p, i) => ({
            project_id: project.id,
            key: p.key,
            label: p.label,
            sort_order: i,
          })),
        ),
      ])
      if (boardResult.error) throw boardResult.error

      await supabase.from('kanban_columns').insert(
        DEFAULT_COLUMNS.map((c, i) => ({
          project_id: project.id,
          board_id: boardResult.data.id,
          name: c.name,
          color: c.color,
          sort_order: i,
        })),
      )

      return project as Project
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useUpdateProject(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (changes: Partial<Project>) => {
      const { error } = await supabase.from('projects').update(changes).eq('id', projectId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['projects', projectId] })
    },
  })
}

export function useDeleteProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase.from('projects').delete().eq('id', projectId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}
