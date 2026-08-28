import {
  ArrowLeft,
  BookText,
  Boxes,
  Download,
  KanbanSquare,
  Lightbulb,
  LogOut,
  Palette,
} from 'lucide-react'
import { clsx } from 'clsx'
import { NavLink, Outlet, useParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { ProjectThemeProvider } from '@/contexts/ProjectThemeContext'
import { useProject } from '@/features/dashboard/useProjects'
import { useProjectThemeQuery } from '@/features/theme-settings/useProjectTheme'

const NAV_ITEMS = [
  { to: 'gdd', label: 'GDD', icon: BookText },
  { to: 'inventory', label: 'Inventário', icon: Boxes },
  { to: 'kanban', label: 'Kanban', icon: KanbanSquare },
  { to: 'ideas', label: 'Hub de Ideias', icon: Lightbulb },
  { to: 'theme', label: 'Tema', icon: Palette },
  { to: 'export', label: 'Exportar', icon: Download },
]

export function ProjectLayout() {
  const { projectId } = useParams<{ projectId: string }>()
  const { data: project, isLoading } = useProject(projectId)
  const { data: theme } = useProjectThemeQuery(projectId)
  const { signOut } = useAuth()

  if (isLoading || !project) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink text-paper">
        <p className="text-label text-sm">Carregando projeto…</p>
      </div>
    )
  }

  return (
    <ProjectThemeProvider theme={theme}>
      <div className="flex min-h-screen bg-ink text-paper">
        <aside className="flex w-64 shrink-0 flex-col border-r-2 border-ink bg-ink-soft">
          <div className="border-b-2 border-ink p-4">
            <NavLink
              to="/dashboard"
              className="text-label mb-3 flex items-center gap-1.5 text-xs text-paper/60 hover:text-paper"
            >
              <ArrowLeft size={14} /> Projetos
            </NavLink>
            <h1 className="text-display truncate text-lg" style={{ color: 'var(--project-primary)' }}>
              {project.name}
            </h1>
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
                      ? 'border-ink bg-accent-yellow text-ink shadow-brutal-sm'
                      : 'text-paper/70 hover:border-ink hover:text-paper',
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
            className="text-label m-3 flex cursor-pointer items-center gap-2.5 border-2 border-ink px-3 py-2 text-xs font-semibold text-paper/70 hover:bg-accent-red hover:text-paper"
          >
            <LogOut size={16} /> Sair
          </button>
        </aside>
        <main className="min-w-0 flex-1 p-6 sm:p-8">
          <Outlet context={{ project }} />
        </main>
      </div>
    </ProjectThemeProvider>
  )
}
