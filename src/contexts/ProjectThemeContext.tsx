import { createContext, type ReactNode, use, useMemo } from 'react'
import type { ProjectTheme } from '@/lib/types'

const DEFAULT_THEME: Pick<
  ProjectTheme,
  'primary_color' | 'accent_color' | 'background_color' | 'logo_url' | 'cover_image_url'
> = {
  primary_color: '#ff3b30',
  accent_color: '#ffd60a',
  background_color: '#0b0b0c',
  logo_url: null,
  cover_image_url: null,
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
      }) as React.CSSProperties,
    [resolved.primary_color, resolved.accent_color, resolved.background_color],
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
