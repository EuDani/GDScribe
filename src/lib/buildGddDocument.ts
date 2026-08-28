import { PHASES, type GddModule, type Project } from '@/lib/types'

export function buildGddMarkdown(project: Project, modules: GddModule[]) {
  const lines: string[] = [`# ${project.name}`, '']
  if (project.description) lines.push(project.description, '')
  lines.push(`_Documento de Design gerado pelo GDScribe em ${new Date().toLocaleDateString('pt-BR')}_`, '')

  for (const phase of PHASES) {
    if (phase.value === 'all') continue
    const phaseModules = modules
      .filter((m) => m.phase === phase.value)
      .sort((a, b) => a.sort_order - b.sort_order)
    if (phaseModules.length === 0) continue

    lines.push(`## ${phase.label}`, '')
    for (const m of phaseModules) {
      lines.push(`### ${m.title}`, '', m.content || '_Vazio._', '')
    }
  }

  const allPhaseModules = modules
    .filter((m) => m.phase === 'all')
    .sort((a, b) => a.sort_order - b.sort_order)
  if (allPhaseModules.length > 0) {
    lines.push('## Geral', '')
    for (const m of allPhaseModules) {
      lines.push(`### ${m.title}`, '', m.content || '_Vazio._', '')
    }
  }

  return lines.join('\n')
}

export function downloadMarkdown(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
