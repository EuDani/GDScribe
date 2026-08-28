import { Download, Printer } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Link, useOutletContext } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import type { Project } from '@/lib/types'
import { buildGddMarkdown, downloadMarkdown } from '@/lib/buildGddDocument'
import { useGddModules } from '@/features/gdd/useGddModules'

export function ExportPage() {
  const { project } = useOutletContext<{ project: Project }>()
  const { data: modules, isLoading } = useGddModules(project.id)

  const markdown = modules ? buildGddMarkdown(project, modules) : ''

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
            onClick={() => downloadMarkdown(`${project.slug}-gdd.md`, markdown)}
          >
            Baixar .md
          </Button>
        </div>
      </div>

      {isLoading && <p className="text-label text-sm text-paper/50">Montando documento…</p>}

      {!isLoading && (
        <Card className="prose prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
        </Card>
      )}
    </div>
  )
}
