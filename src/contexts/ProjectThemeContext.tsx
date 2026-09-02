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

  // Além das variáveis --project-* (usadas em alguns lugares pontuais, tipo
  // o título do projeto e o selo do logo), sobrescreve as variáveis que as
  // classes utilitárias do Tailwind realmente consomem (bg-accent-yellow,
  // bg-canvas, etc.) — sem isso o tema só mudava esses dois lugares
  // pontuais e o resto do app (botões, badges, fundo) ficava sempre com a
  // cor padrão fixa, dando a impressão de que o menu de tema "não funciona".
  const style = useMemo(
    () =>
      ({
        '--project-primary': resolved.primary_color,
        '--project-accent': resolved.accent_color,
        '--project-bg': resolved.background_color,
        '--project-surface': resolved.surface_color,
        '--project-fg': resolved.text_color,
        '--color-accent-red': resolved.primary_color,
        '--color-accent-yellow': resolved.accent_color,
        '--color-canvas': resolved.background_color,
        '--color-surface': resolved.surface_color,
        '--color-canvas-fg': resolved.text_color,
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
