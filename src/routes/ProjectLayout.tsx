import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  BookMarked,
  BookOpen,
  BookText,
  Boxes,
  CalendarDays,
  Download,
  Images,
  KanbanSquare,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
} from 'lucide-react'
import { clsx } from 'clsx'
import { motion } from 'motion/react'
import { Link, NavLink, Outlet, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'
import { ProjectThemeProvider } from '@/contexts/ProjectThemeContext'
import { useProject } from '@/features/dashboard/useProjects'
import { useProjectThemeQuery } from '@/features/theme-settings/useProjectTheme'
import { UserMenu } from '@/components/UserMenu'
import { TodayReminderBanner } from '@/features/reminders/TodayReminderBanner'
import { useReminderScheduler } from '@/features/reminders/useReminderScheduler'

const NAV_ITEMS = [
  { to: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
  { to: 'gdd', label: 'GDD', icon: BookText },
  { to: 'story', label: 'História', icon: BookOpen },
  { to: 'inventory', label: 'Inventário', icon: Boxes },
  { to: 'references', label: 'Referências', icon: BookMarked },
  { to: 'kanban', label: 'Kanban', icon: KanbanSquare },
  { to: 'moodboard', label: 'Moodboard', icon: Images },
  { to: 'calendar', label: 'Calendário', icon: CalendarDays },
  { to: 'ideas', label: 'Hub de Ideias', icon: Lightbulb },
  { to: 'export', label: 'Exportar', icon: Download },
  { to: 'settings', label: 'Configurações', icon: Settings },
]

const COLLAPSE_KEY = 'gdscribe.sidebarCollapsed'

export function ProjectLayout() {
  const { projectId } = useParams<{ projectId: string }>()
  const { data: project, isLoading, isError, error, refetch } = useProject(projectId)
  const { data: theme } = useProjectThemeQuery(projectId)
  const { signOut } = useAuth()

  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === '1')

  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0')
  }, [collapsed])

  useReminderScheduler(projectId)

  if (isError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-canvas p-6 text-center text-canvas-fg">
        <p className="text-display text-lg">Não deu para carregar esse projeto</p>
        <p className="max-w-sm text-sm text-canvas-fg/60">
          {error instanceof Error ? error.message : 'Erro desconhecido.'}
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => refetch()}>
            Tentar de novo
          </Button>
          <Link to="/dashboard">
            <Button>Voltar aos projetos</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (isLoading || !project) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas text-canvas-fg">
        <p className="text-label text-sm">Carregando projeto…</p>
      </div>
    )
  }

  return (
    <ProjectThemeProvider theme={theme}>
      <div className="flex min-h-screen bg-canvas text-canvas-fg">
        <motion.aside
          animate={{ width: collapsed ? 60 : 256 }}
          transition={{ duration: 0.18, ease: 'easeInOut' }}
          className="flex shrink-0 flex-col overflow-hidden border-r-2 border-line bg-surface"
        >
          <div className="border-b-2 border-line p-3">
            <div className="mb-3 flex items-center justify-between gap-1">
              <NavLink
                to="/dashboard"
                title="Projetos"
                className="text-label flex items-center gap-1.5 text-xs text-canvas-fg/60 hover:text-canvas-fg"
              >
                <ArrowLeft size={14} />
                {!collapsed && 'Projetos'}
              </NavLink>
              <button
                type="button"
                onClick={() => setCollapsed((c) => !c)}
                aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
                className="cursor-pointer border-2 border-line p-1 text-canvas-fg/60 hover:bg-accent-yellow hover:text-ink"
              >
                {collapsed ? <PanelLeftOpen size={13} /> : <PanelLeftClose size={13} />}
              </button>
            </div>
            <div className="flex items-center gap-2">
              {theme?.logo_url ? (
                <img
                  src={theme.logo_url}
                  alt=""
                  className="h-8 w-8 shrink-0 border-2 border-line object-cover"
                />
              ) : (
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-line text-sm font-bold text-ink"
                  style={{ backgroundColor: 'var(--project-accent)' }}
                >
                  {project.name.charAt(0).toUpperCase()}
                </span>
              )}
              {!collapsed && (
                <h1
                  className="text-display truncate text-lg"
                  style={{ color: 'var(--project-primary)' }}
                >
                  {project.name}
                </h1>
              )}
            </div>
          </div>
          <nav className="flex-1 space-y-1 p-3">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                title={collapsed ? label : undefined}
                className={({ isActive }) =>
                  clsx(
                    'text-label flex items-center gap-2.5 border-2 border-transparent px-3 py-2 text-xs font-semibold transition-colors',
                    isActive
                      ? 'border-line bg-accent-yellow text-ink shadow-brutal-sm'
                      : 'text-canvas-fg/70 hover:border-line hover:text-canvas-fg',
                  )
                }
              >
                <Icon size={16} className="shrink-0" />
                {!collapsed && <span className="truncate">{label}</span>}
              </NavLink>
            ))}
          </nav>
          <button
            type="button"
            onClick={signOut}
            title={collapsed ? 'Sair' : undefined}
            className="text-label m-3 flex cursor-pointer items-center gap-2.5 border-2 border-line px-3 py-2 text-xs font-semibold text-canvas-fg/70 hover:bg-accent-red hover:text-canvas-fg"
          >
            <LogOut size={16} className="shrink-0" />
            {!collapsed && 'Sair'}
          </button>
        </motion.aside>
        <main className="min-w-0 flex-1 p-6 sm:p-8">
          <Outlet context={{ project }} />
        </main>
        <UserMenu />
        <TodayReminderBanner projectId={project.id} />
      </div>
    </ProjectThemeProvider>
  )
}
