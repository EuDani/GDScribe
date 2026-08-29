import type { GddModule, Project, ProjectPhase } from '@/lib/types'
import { isHtmlEmpty } from '@/lib/html'

function renderModule(m: GddModule, children: GddModule[]) {
  const parts = [`<h3>${escapeHtml(m.title)}</h3>`, isHtmlEmpty(m.content) ? '<p><em>Vazio.</em></p>' : m.content]
  for (const child of children.sort((a, b) => a.sort_order - b.sort_order)) {
    parts.push(`<h4>${escapeHtml(child.title)}</h4>`)
    parts.push(isHtmlEmpty(child.content) ? '<p><em>Vazio.</em></p>' : child.content)
  }
  return parts.join('\n')
}

/** Corpo HTML do documento (sem <html>/<head>) — usado tanto na prévia
 * dentro do app quanto embutido no HTML final para download/impressão. */
export function buildGddHtmlFragment(project: Project, modules: GddModule[], phases: ProjectPhase[]) {
  const parts: string[] = [`<h1>${escapeHtml(project.name)}</h1>`]
  if (project.description) parts.push(`<p class="lead">${escapeHtml(project.description)}</p>`)
  parts.push(
    `<p class="meta"><em>Documento de Design gerado pelo GDScribe em ${new Date().toLocaleDateString('pt-BR')}</em></p>`,
  )

  const topLevel = modules.filter((m) => !m.parent_id)
  const childrenByParent = new Map<string, GddModule[]>()
  for (const m of modules) {
    if (!m.parent_id) continue
    const list = childrenByParent.get(m.parent_id) ?? []
    list.push(m)
    childrenByParent.set(m.parent_id, list)
  }

  for (const phase of phases) {
    const phaseModules = topLevel
      .filter((m) => m.phase === phase.key)
      .sort((a, b) => a.sort_order - b.sort_order)
    if (phaseModules.length === 0) continue

    parts.push(`<h2>${escapeHtml(phase.label)}</h2>`)
    for (const m of phaseModules) {
      parts.push(renderModule(m, childrenByParent.get(m.id) ?? []))
    }
  }

  const allPhaseModules = topLevel.filter((m) => m.phase === 'all').sort((a, b) => a.sort_order - b.sort_order)
  if (allPhaseModules.length > 0) {
    parts.push('<h2>Geral</h2>')
    for (const m of allPhaseModules) {
      parts.push(renderModule(m, childrenByParent.get(m.id) ?? []))
    }
  }

  return parts.join('\n')
}

/** Documento HTML completo e autocontido, pronto para baixar ou imprimir. */
export function buildGddStandaloneHtml(project: Project, modules: GddModule[], phases: ProjectPhase[]) {
  const body = buildGddHtmlFragment(project, modules, phases)
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(project.name)} — GDD</title>
<style>
  body { font-family: Georgia, 'Times New Roman', serif; max-width: 760px; margin: 40px auto; padding: 0 24px; color: #0b0b0c; line-height: 1.6; }
  h1 { font-size: 2.2em; }
  h2 { margin-top: 2em; border-bottom: 3px solid #0b0b0c; padding-bottom: 0.2em; }
  h3 { margin-top: 1.5em; }
  h4 { margin-top: 1em; margin-left: 1em; }
  .lead { font-size: 1.1em; color: #444; }
  .meta { color: #777; font-size: 0.9em; }
  img { max-width: 100%; border: 2px solid #0b0b0c; }
  blockquote { border-left: 3px solid #0b0b0c; margin-left: 0; padding-left: 1em; color: #444; }
  a { color: #0a58ff; }
</style>
</head>
<body>
${body}
</body>
</html>`
}

export function downloadHtml(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function escapeHtml(text: string) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}
