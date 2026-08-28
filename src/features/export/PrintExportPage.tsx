import { Printer } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { useProject } from '@/features/dashboard/useProjects'
import { useGddModules } from '@/features/gdd/useGddModules'
import { useProjectThemeQuery } from '@/features/theme-settings/useProjectTheme'
import { buildGddMarkdown } from '@/lib/buildGddDocument'

export function PrintExportPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { data: project } = useProject(projectId)
  const { data: modules } = useGddModules(projectId)
  const { data: theme } = useProjectThemeQuery(projectId)

  if (!project || !modules) {
    return <p className="p-8 text-sm">Carregando documento…</p>
  }

  const markdown = buildGddMarkdown(project, modules)

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="no-print sticky top-0 flex justify-end border-b border-black/20 bg-white p-3">
        <Button size="sm" icon={<Printer size={16} />} onClick={() => window.print()}>
          Imprimir / Salvar como PDF
        </Button>
      </div>

      <article className="mx-auto max-w-3xl px-8 py-12">
        <header className="mb-10 border-b-4 pb-6" style={{ borderColor: theme?.primary_color ?? '#000' }}>
          {theme?.logo_url && <img src={theme.logo_url} alt="" className="mb-4 h-16 w-16 object-cover" />}
          <h1 className="text-4xl font-black uppercase">{project.name}</h1>
          {project.description && <p className="mt-2 text-lg text-black/70">{project.description}</p>}
        </header>
        <div className="prose max-w-none prose-headings:font-black prose-headings:uppercase">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
        </div>
      </article>
    </div>
  )
}
