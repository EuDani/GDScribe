import { createContext, type ReactNode, use, useMemo } from 'react'
import type { ProjectTheme } from '@/lib/types'

const DEFAULT_THEME: Pick<
  ProjectTheme,
  'primary_color' | 'accent_color' | 'background_color' | 'surface_color' | 'text_color' | 'logo_url' | 'cover_image_url' | 'chart_colors'
> = {
  primary_color: '#ff3b30',
  accent_color: '#ffd60a',
  background_color: '#0b0b0c',
  surface_color: '#17171a',
  text_color: '#f3efe3',
  logo_url: null,
  cover_image_url: null,
  chart_colors: ['#ff3b30', '#0a84ff', '#ffd60a', '#30d158', '#bf5af2'],
}

const ProjectThemeContext = createContext<ProjectTheme | null>(null)

export function ProjectThemeProvider({
  theme,
  children,
}: {
  theme: ProjectTheme | null | undefined
  children: ReactNode
}) {
  const resolved = theme ?? { project_id: '', font_choice: 'default', ...DEFAULT_THEME }

  const style = useMemo(
    () =>
      ({
        '--project-primary': resolved.primary_color,
        '--project-accent': resolved.accent_color,
        '--project-bg': resolved.background_color,
        '--project-surface': resolved.surface_color,
        '--project-fg': resolved.text_color,
      }) as React.CSSProperties,
    [resolved.primary_color, resolved.accent_color, resolved.background_color, resolved.surface_color, resolved.text_color],
  )

  return (
    <ProjectThemeContext value={resolved}>
      <div style={style} className="contents">
        {children}
      </div>
    </ProjectThemeContext>
  )
}

export function useProjectTheme() {
  const ctx = use(ProjectThemeContext)
  return ctx
}
