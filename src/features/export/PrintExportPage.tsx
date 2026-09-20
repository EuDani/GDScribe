import { Printer } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { useProject } from '@/features/dashboard/useProjects'
import { useGddModules } from '@/features/gdd/useGddModules'
import { useProjectThemeQuery } from '@/features/theme-settings/useProjectTheme'
import { buildGddHtmlFragment } from '@/lib/buildGddDocument'
import { useProjectPhases } from '@/features/settings/useProjectPhases'

export function PrintExportPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { data: project } = useProject(projectId)
  const { data: modules } = useGddModules(projectId)
  const { data: theme } = useProjectThemeQuery(projectId)
  const { data: phases } = useProjectPhases(projectId)

  if (!project || !modules || !phases) {
    return <p className="p-8 text-sm">Carregando documento…</p>
  }

  const fragment = buildGddHtmlFragment(project, modules, phases)

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="no-print sticky top-0 flex justify-end border-b border-black/20 bg-white p-3">
        <Button size="sm" icon={<Printer size={16} />} onClick={() => window.print()}>
          Imprimir / Salvar como PDF
        </Button>
      </div>

      <article className="mx-auto max-w-3xl px-8 py-12">
        {theme?.logo_url && (
          <img
            src={theme.logo_url}
            alt=""
            className="mb-6 h-16 w-16 object-cover"
            style={{ border: `4px solid ${theme.primary_color}` }}
          />
        )}
        <div
          className="prose max-w-none prose-headings:font-black prose-headings:uppercase prose-h2:border-b-4 prose-h2:pb-1"
          style={{ ['--tw-prose-headings' as string]: theme?.primary_color }}
          dangerouslySetInnerHTML={{ __html: fragment }}
        />
      </article>
    </div>
  )
}
