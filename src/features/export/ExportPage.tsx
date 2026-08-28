import { Download, Printer } from 'lucide-react'
import { Link, useOutletContext } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import type { Project } from '@/lib/types'
import { buildGddHtmlFragment, buildGddStandaloneHtml, downloadHtml } from '@/lib/buildGddDocument'
import { useGddModules } from '@/features/gdd/useGddModules'

export function ExportPage() {
  const { project } = useOutletContext<{ project: Project }>()
  const { data: modules, isLoading } = useGddModules(project.id)

  const fragment = modules ? buildGddHtmlFragment(project, modules) : ''

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-display text-2xl">Exportar GDD</h1>
        <div className="flex gap-2">
          <Link to={`/export/print/${project.id}`} target="_blank">
            <Button variant="ghost" size="sm" icon={<Printer size={16} />}>
              Ver para impressão / PDF
            </Button>
          </Link>
          <Button
            size="sm"
            icon={<Download size={16} />}
            disabled={isLoading}
            onClick={() =>
              modules && downloadHtml(`${project.slug}-gdd.html`, buildGddStandaloneHtml(project, modules))
            }
          >
            Baixar .html
          </Button>
        </div>
      </div>

      {isLoading && <p className="text-label text-sm text-canvas-fg/50">Montando documento…</p>}

      {!isLoading && (
        <div
          className="prose prose-invert max-w-none border-2 border-line bg-surface p-5 shadow-brutal"
          dangerouslySetInnerHTML={{ __html: fragment }}
        />
      )}
    </div>
  )
}
