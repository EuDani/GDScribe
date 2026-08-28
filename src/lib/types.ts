export type Phase = 'pre_production' | 'production' | 'post_production' | 'all'

export const PHASES: { value: Phase; label: string }[] = [
  { value: 'all', label: 'Todas as fases' },
  { value: 'pre_production', label: 'Pré-produção' },
  { value: 'production', label: 'Produção' },
  { value: 'post_production', label: 'Pós-produção' },
]

export const STEAM_GENRES = [
  'Ação',
  'Aventura',
  'Casual',
  'Indie',
  'RPG',
  'Simulação',
  'Estratégia',
  'Esportes',
  'Corrida',
  'Multijogador massivo',
  'Terror',
  'Puzzle',
  'Plataforma',
  'Luta',
  'Roguelike',
  'Metroidvania',
  'Sobrevivência',
  'Sandbox',
  'Visual Novel',
  'Card Game',
  'Educacional',
  'Música/Ritmo',
  'Acesso Antecipado',
  'Free to Play',
]

export interface Project {
  id: string
  owner_id: string
  name: string
  slug: string
  description: string | null
  status: string
  primary_genre: string | null
  secondary_genre: string | null
  created_at: string
  updated_at: string
}

export interface ProjectTheme {
  project_id: string
  primary_color: string
  accent_color: string
  background_color: string
  logo_url: string | null
  cover_image_url: string | null
  font_choice: string
}

export type ExtraFieldType = 'text' | 'number' | 'list' | 'chart'

export interface ChartPoint {
  label: string
  value: number
}

export interface ExtraField {
  id: string
  label: string
  type: ExtraFieldType
  value: string | number | string[] | ChartPoint[]
}

export interface GddModule {
  id: string
  project_id: string
  key: string
  title: string
  icon: string
  phase: Phase
  status: string | null
  sort_order: number
  is_custom: boolean
  content: string
  extra_fields: ExtraField[]
  updated_at: string
}

export type FieldType = 'text' | 'number' | 'textarea' | 'select' | 'image'

export interface InventoryField {
  key: string
  label: string
  type: FieldType
  options?: string[]
}

export interface InventoryType {
  id: string
  project_id: string
  name: string
  icon: string
  fields_schema: InventoryField[]
  sort_order: number
}

export interface InventoryItem {
  id: string
  type_id: string
  project_id: string
  status: string | null
  data: Record<string, string | number | null>
  created_at: string
  updated_at: string
}

export interface KanbanColumn {
  id: string
  project_id: string
  name: string
  color: string
  sort_order: number
}

export interface ChecklistItem {
  id: string
  text: string
  done: boolean
}

export interface KanbanCard {
  id: string
  column_id: string
  project_id: string
  title: string
  description: string | null
  tags: string[]
  icon: string | null
  cover_image_url: string | null
  checklist: ChecklistItem[]
  start_date: string | null
  due_date: string | null
  sort_order: number
  created_at: string
}

export type IdeaStatus = 'new' | 'considering' | 'approved' | 'rejected'

export const IDEA_STATUSES: { value: IdeaStatus; label: string; color: string }[] = [
  { value: 'new', label: 'Nova', color: 'var(--color-accent-blue)' },
  { value: 'considering', label: 'Em análise', color: 'var(--color-accent-yellow)' },
  { value: 'approved', label: 'Aprovada', color: 'var(--color-accent-green)' },
  { value: 'rejected', label: 'Rejeitada', color: 'var(--color-accent-red)' },
]

export interface Idea {
  id: string
  project_id: string
  title: string
  body: string | null
  tags: string[]
  status: IdeaStatus
  created_at: string
  updated_at: string
}

export type AppThemeMode = 'light' | 'dark' | 'auto'

export interface StoryBlock {
  id: string
  project_id: string
  title: string
  content: string
  sort_order: number
  updated_at: string
}

export interface GameReference {
  id: string
  project_id: string
  title: string
  source_url: string | null
  image_url: string | null
  notes: string
  checklist: ChecklistItem[]
  created_at: string
  updated_at: string
}

export type NotificationUnit = 'minutes' | 'hours' | 'days' | 'weeks'

export const NOTIFICATION_UNITS: { value: NotificationUnit; label: string }[] = [
  { value: 'minutes', label: 'minutos' },
  { value: 'hours', label: 'horas' },
  { value: 'days', label: 'dias' },
  { value: 'weeks', label: 'semanas' },
]

export type NotificationKind = 'before' | 'same_day_at'

export interface NotificationRule {
  id: string
  kind: NotificationKind
  amount: number | null // usado quando kind === 'before'
  unit: NotificationUnit | null // usado quando kind === 'before'
  time: string | null // "HH:mm", usado quando kind === 'same_day_at'
}

export interface Reminder {
  id: string
  project_id: string
  title: string
  event_date: string // YYYY-MM-DD
  event_time: string | null // HH:mm
  notes: string | null
  notifications: NotificationRule[]
  created_at: string
  updated_at: string
}
