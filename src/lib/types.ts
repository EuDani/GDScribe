// Fases não são mais um enum fixo — cada projeto tem as suas próprias,
// guardadas em project_phases e totalmente editáveis (ver Configurações).
// 'all' continua sendo um pseudo-valor só de UI (nunca salvo no banco) que
// significa "todas as fases" nos filtros do GDD.
export type Phase = string

export const ALL_PHASES = 'all'

export interface ProjectPhase {
  id: string
  project_id: string
  key: string
  label: string
  sort_order: number
}

/** Pseudo-valor de UI: "todos os setores", nunca salvo no banco. */
export const ALL_SECTORS = 'all'

export interface ProjectSector {
  id: string
  project_id: string
  name: string
  color: string
  sort_order: number
}

/** Usado só para semear as 3 fases padrão de um projeto novo. */
export const DEFAULT_PHASES: { key: string; label: string }[] = [
  { key: 'pre_production', label: 'Pré-produção' },
  { key: 'production', label: 'Produção' },
  { key: 'post_production', label: 'Pós-produção' },
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
  cover_image_url: string | null
  created_at: string
  updated_at: string
}

export interface ProjectTheme {
  project_id: string
  primary_color: string
  accent_color: string
  background_color: string
  surface_color: string
  text_color: string
  logo_url: string | null
  cover_image_url: string | null
  font_choice: string
  chart_colors: string[]
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
  parent_id: string | null
  key: string
  title: string
  icon: string
  phase: Phase
  status: string | null
  sort_order: number
  is_custom: boolean
  content: string
  extra_fields: ExtraField[]
  sectors: string[]
  updated_at: string
}

export type FieldType = 'text' | 'number' | 'textarea' | 'select' | 'image' | 'list'

export interface InventoryField {
  key: string
  label: string
  type: FieldType
  options?: string[]
  required?: boolean
}

export interface InventoryType {
  id: string
  project_id: string
  name: string
  icon: string
  fields_schema: InventoryField[]
  sort_order: number
}

export type InventoryValue = string | number | string[] | null

export interface InventoryItem {
  id: string
  type_id: string
  project_id: string
  status: string | null
  data: Record<string, InventoryValue>
  tags: string[]
  sectors: string[]
  created_at: string
  updated_at: string
}

export interface KanbanBoard {
  id: string
  project_id: string
  name: string
  sort_order: number
  created_at: string
}

export interface KanbanColumn {
  id: string
  project_id: string
  board_id: string
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
  board_id: string
  title: string
  description: string | null
  tags: string[]
  icon: string | null
  cover_image_url: string | null
  checklist: ChecklistItem[]
  extra_fields: ExtraField[]
  start_date: string | null
  due_date: string | null
  sectors: string[]
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
  sectors: string[]
  status: IdeaStatus
  created_at: string
  updated_at: string
}

export type AppThemeMode = 'light' | 'dark' | 'auto'

export interface MoodboardFolder {
  id: string
  project_id: string
  parent_id: string | null
  name: string
  sort_order: number
  created_at: string
}

export interface MoodboardImage {
  id: string
  project_id: string
  folder_id: string | null
  image_url: string
  caption: string | null
  sort_order: number
  created_at: string
}

export interface StoryBlock {
  id: string
  project_id: string
  parent_id: string | null
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
  image_urls: string[]
  tags: string[]
  notes: string
  checklist: ChecklistItem[]
  created_at: string
  updated_at: string
}

export type FlowchartNodeShape = 'rectangle' | 'rounded' | 'diamond' | 'circle'

export interface FlowchartNode {
  id: string
  x: number
  y: number
  width: number
  height: number
  text: string
  color: string
  shape: FlowchartNodeShape
  comment: string
}

export type FlowchartLineStyle = 'solid' | 'dashed' | 'dotted'

export interface FlowchartEdge {
  id: string
  from: string
  to: string
  label?: string
  color: string
  lineStyle: FlowchartLineStyle
}

export interface Flowchart {
  id: string
  project_id: string
  name: string
  nodes: FlowchartNode[]
  edges: FlowchartEdge[]
  sort_order: number
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

export type ReminderImportance = 'low' | 'normal' | 'high'

export const REMINDER_IMPORTANCE: { value: ReminderImportance; label: string; color: string }[] = [
  { value: 'low', label: 'Baixa', color: 'var(--color-accent-blue)' },
  { value: 'normal', label: 'Normal', color: 'var(--color-accent-yellow)' },
  { value: 'high', label: 'Alta', color: 'var(--color-accent-red)' },
]

export interface Reminder {
  id: string
  project_id: string
  title: string
  event_date: string // YYYY-MM-DD — início/data do evento
  event_time: string | null // HH:mm
  end_date: string | null // YYYY-MM-DD — quando a tarefa precisa acabar
  notes: string | null
  notifications: NotificationRule[]
  tags: string[]
  sectors: string[]
  image_url: string | null
  importance: ReminderImportance
  created_at: string
  updated_at: string
}

/** Atrasado = tem prazo (end_date ou event_date) já passado. */
export function isReminderOverdue(r: Pick<Reminder, 'event_date' | 'end_date'>): boolean {
  const deadline = r.end_date ?? r.event_date
  const today = new Date().toISOString().slice(0, 10)
  return deadline < today
}
