import {
  ArrowLeft,
  BookText,
  Boxes,
  CalendarDays,
  Download,
  KanbanSquare,
  LayoutDashboard,
  Lightbulb,
  LogOut,
} from 'lucide-react'
import { clsx } from 'clsx'
import { NavLink, Outlet, useParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { ProjectThemeProvider } from '@/contexts/ProjectThemeContext'
import { useProject } from '@/features/dashboard/useProjects'
import { useProjectThemeQuery } from '@/features/theme-settings/useProjectTheme'
import { UserMenu } from '@/components/UserMenu'

const NAV_ITEMS = [
  { to: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
  { to: 'gdd', label: 'GDD', icon: BookText },
  { to: 'inventory', label: 'Inventário', icon: Boxes },
  { to: 'kanban', label: 'Kanban', icon: KanbanSquare },
  { to: 'calendar', label: 'Calendário', icon: CalendarDays },
  { to: 'ideas', label: 'Hub de Ideias', icon: Lightbulb },
  { to: 'export', label: 'Exportar', icon: Download },
]

export function ProjectLayout() {
  const { projectId } = useParams<{ projectId: string }>()
  const { data: project, isLoading } = useProject(projectId)
  const { data: theme } = useProjectThemeQuery(projectId)
  const { signOut } = useAuth()

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
        <aside className="flex w-64 shrink-0 flex-col border-r-2 border-line bg-surface">
          <div className="border-b-2 border-line p-4">
            <NavLink
              to="/dashboard"
              className="text-label mb-3 flex items-center gap-1.5 text-xs text-canvas-fg/60 hover:text-canvas-fg"
            >
              <ArrowLeft size={14} /> Projetos
            </NavLink>
            <div className="flex items-center gap-2">
              {theme?.logo_url && (
                <img
                  src={theme.logo_url}
                  alt=""
                  className="h-8 w-8 shrink-0 border-2 border-line object-cover"
                />
              )}
              <h1
                className="text-display truncate text-lg"
                style={{ color: 'var(--project-primary)' }}
              >
                {project.name}
              </h1>
            </div>
          </div>
          <nav className="flex-1 space-y-1 p-3">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  clsx(
                    'text-label flex items-center gap-2.5 border-2 border-transparent px-3 py-2 text-xs font-semibold transition-colors',
                    isActive
                      ? 'border-line bg-accent-yellow text-ink shadow-brutal-sm'
                      : 'text-canvas-fg/70 hover:border-line hover:text-canvas-fg',
                  )
                }
              >
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </nav>
          <button
            type="button"
            onClick={signOut}
            className="text-label m-3 flex cursor-pointer items-center gap-2.5 border-2 border-line px-3 py-2 text-xs font-semibold text-canvas-fg/70 hover:bg-accent-red hover:text-canvas-fg"
          >
            <LogOut size={16} /> Sair
          </button>
        </aside>
        <main className="min-w-0 flex-1 p-6 sm:p-8">
          <Outlet context={{ project }} />
        </main>
        <UserMenu projectId={project.id} />
      </div>
    </ProjectThemeProvider>
  )
}
