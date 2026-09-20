import type {
  GameReference,
  GddModule,
  Idea,
  InventoryItem,
  InventoryType,
  KanbanBoard,
  KanbanCard,
  KanbanColumn,
  Project,
  ProjectPhase,
  StoryBlock,
} from '@/lib/types'
import { isHtmlEmpty, stripHtml } from '@/lib/html'

function renderModule(m: GddModule, children: GddModule[]) {
  const parts = [`<h3>${escapeHtml(m.title)}</h3>`, isHtmlEmpty(m.content) ? '<p><em>Vazio.</em></p>' : m.content]
  for (const child of children.sort((a, b) => a.sort_order - b.sort_order)) {
    parts.push(`<h4>${escapeHtml(child.title)}</h4>`)
    parts.push(isHtmlEmpty(child.content) ? '<p><em>Vazio.</em></p>' : child.content)
  }
  return parts.join('\n')
}

/** Fragmento só dos módulos do GDD, sem cabeçalho de projeto — usado tanto
 * standalone quanto embutido num documento maior com outras seções. */
export function buildGddModulesFragment(modules: GddModule[], phases: ProjectPhase[]) {
  const parts: string[] = []
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

/** Corpo HTML do documento (sem <html>/<head>) — usado tanto na prévia
 * dentro do app quanto embutido no HTML final para download/impressão. */
export function buildGddHtmlFragment(project: Project, modules: GddModule[], phases: ProjectPhase[]) {
  const parts: string[] = [`<h1>${escapeHtml(project.name)}</h1>`]
  if (project.description) parts.push(`<p class="lead">${escapeHtml(project.description)}</p>`)
  parts.push(
    `<p class="meta"><em>Documento de Design gerado pelo GDScribe em ${new Date().toLocaleDateString('pt-BR')}</em></p>`,
  )
  parts.push(buildGddModulesFragment(modules, phases))
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

function renderStoryBlock(b: StoryBlock, children: StoryBlock[]): string {
  const parts = [`<h3>${escapeHtml(b.title)}</h3>`, isHtmlEmpty(b.content) ? '<p><em>Vazio.</em></p>' : b.content]
  for (const child of children.sort((a, c) => a.sort_order - c.sort_order)) {
    parts.push(`<h4>${escapeHtml(child.title)}</h4>`)
    parts.push(isHtmlEmpty(child.content) ? '<p><em>Vazio.</em></p>' : child.content)
  }
  return parts.join('\n')
}

/** Fragmento HTML da seção de História, filtrado pelos blocos selecionados
 * (ids de blocos de topo — sub-blocos de um bloco incluído entram junto). */
export function buildStoryFragment(blocks: StoryBlock[], selectedIds: Set<string> | 'all'): string {
  const topLevel = blocks
    .filter((b) => !b.parent_id)
    .filter((b) => selectedIds === 'all' || selectedIds.has(b.id))
    .sort((a, b) => a.sort_order - b.sort_order)
  if (topLevel.length === 0) return ''

  const childrenByParent = new Map<string, StoryBlock[]>()
  for (const b of blocks) {
    if (!b.parent_id) continue
    const list = childrenByParent.get(b.parent_id) ?? []
    list.push(b)
    childrenByParent.set(b.parent_id, list)
  }

  const parts = ['<h2>História</h2>']
  for (const b of topLevel) parts.push(renderStoryBlock(b, childrenByParent.get(b.id) ?? []))
  return parts.join('\n')
}

/** Fragmento HTML da seção de Inventário, filtrado pelos tipos selecionados. */
export function buildInventoryFragment(
  types: InventoryType[],
  items: InventoryItem[],
  selectedTypeIds: Set<string> | 'all',
): string {
  const included = types.filter((t) => selectedTypeIds === 'all' || selectedTypeIds.has(t.id))
  if (included.length === 0) return ''

  const parts = ['<h2>Inventário</h2>']
  for (const type of included) {
    const typeItems = items.filter((i) => i.type_id === type.id)
    parts.push(`<h3>${escapeHtml(type.name)}</h3>`)
    if (typeItems.length === 0) {
      parts.push('<p><em>Nenhum item.</em></p>')
      continue
    }
    parts.push('<ul>')
    for (const item of typeItems) {
      const primary = type.fields_schema[0]
      const title = primary ? String(item.data[primary.key] ?? '') || 'Sem título' : 'Item'
      const rest = type.fields_schema
        .slice(1)
        .map((f) => {
          const v = item.data[f.key]
          if (v === null || v === undefined || v === '') return null
          return `${escapeHtml(f.label)}: ${escapeHtml(Array.isArray(v) ? v.join(', ') : String(v))}`
        })
        .filter(Boolean)
      parts.push(`<li><strong>${escapeHtml(title)}</strong>${rest.length > 0 ? ` — ${rest.join(' · ')}` : ''}</li>`)
    }
    parts.push('</ul>')
  }
  return parts.join('\n')
}

/** Fragmento HTML da seção de Kanban, filtrado pelos quadros selecionados. */
export function buildKanbanFragment(
  boards: KanbanBoard[],
  columns: KanbanColumn[],
  cards: KanbanCard[],
  selectedBoardIds: Set<string> | 'all',
): string {
  const included = boards.filter((b) => selectedBoardIds === 'all' || selectedBoardIds.has(b.id))
  if (included.length === 0) return ''

  const parts = ['<h2>Kanban</h2>']
  for (const board of included) {
    parts.push(`<h3>${escapeHtml(board.name)}</h3>`)
    const boardColumns = columns.filter((c) => c.board_id === board.id).sort((a, b) => a.sort_order - b.sort_order)
    for (const column of boardColumns) {
      const columnCards = cards
        .filter((c) => c.column_id === column.id)
        .sort((a, b) => a.sort_order - b.sort_order)
      parts.push(`<h4>${escapeHtml(column.name)} (${columnCards.length})</h4>`)
      if (columnCards.length === 0) {
        parts.push('<p><em>Vazio.</em></p>')
        continue
      }
      parts.push('<ul>')
      for (const card of columnCards) {
        parts.push(
          `<li><strong>${escapeHtml(card.title)}</strong>${card.description ? ` — ${escapeHtml(card.description)}` : ''}</li>`,
        )
      }
      parts.push('</ul>')
    }
  }
  return parts.join('\n')
}

/** Fragmento HTML da seção de Ideias. */
export function buildIdeasFragment(ideas: Idea[]): string {
  if (ideas.length === 0) return ''
  const parts = ['<h2>Ideias</h2>', '<ul>']
  for (const idea of ideas) {
    const body = idea.body && !isHtmlEmpty(idea.body) ? ` — ${escapeHtml(stripHtml(idea.body)).slice(0, 200)}` : ''
    parts.push(`<li><strong>${escapeHtml(idea.title)}</strong> (${escapeHtml(idea.status)})${body}</li>`)
  }
  parts.push('</ul>')
  return parts.join('\n')
}

/** Fragmento HTML da seção de Referências. */
export function buildReferencesFragment(references: GameReference[]): string {
  if (references.length === 0) return ''
  const parts = ['<h2>Referências</h2>', '<ul>']
  for (const ref of references) {
    const notes = ref.notes && !isHtmlEmpty(ref.notes) ? ` — ${escapeHtml(stripHtml(ref.notes)).slice(0, 200)}` : ''
    const link = ref.source_url ? ` (<a href="${escapeHtml(ref.source_url)}">link</a>)` : ''
    parts.push(`<li><strong>${escapeHtml(ref.title)}</strong>${link}${notes}</li>`)
  }
  parts.push('</ul>')
  return parts.join('\n')
}

/** Junta o cabeçalho do projeto com as seções já filtradas (cada uma pode
 * vir como string vazia se a seção inteira foi desmarcada). */
export function buildFullExportFragment(project: Project, sections: string[]): string {
  const parts: string[] = [`<h1>${escapeHtml(project.name)}</h1>`]
  if (project.description) parts.push(`<p class="lead">${escapeHtml(project.description)}</p>`)
  parts.push(
    `<p class="meta"><em>Documento gerado pelo GDScribe em ${new Date().toLocaleDateString('pt-BR')}</em></p>`,
  )
  parts.push(...sections.filter(Boolean))
  return parts.join('\n')
}

export function buildStandaloneHtml(project: Project, body: string): string {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(project.name)} — Documento</title>
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
