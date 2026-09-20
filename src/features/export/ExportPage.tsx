import { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, CornerDownRight, Download, ListChecks, Printer } from 'lucide-react'
import { Link, useOutletContext } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import type { Project } from '@/lib/types'
import {
  buildFullExportFragment,
  buildGddModulesFragment,
  buildIdeasFragment,
  buildInventoryFragment,
  buildKanbanFragment,
  buildReferencesFragment,
  buildStandaloneHtml,
  buildStoryFragment,
  downloadHtml,
} from '@/lib/buildGddDocument'
import { useGddModules } from '@/features/gdd/useGddModules'
import { useProjectPhases } from '@/features/settings/useProjectPhases'
import { useStoryBlocks } from '@/features/story/useStoryBlocks'
import { useAllInventoryItems, useInventoryTypes } from '@/features/inventory/useInventory'
import { useAllKanbanCards, useAllKanbanColumns, useKanbanBoards } from '@/features/kanban/useKanban'
import { useIdeas } from '@/features/ideas/useIdeas'
import { useReferences } from '@/features/references/useReferences'

const SECTION_DEFS = [
  { key: 'gdd', label: 'GDD' },
  { key: 'story', label: 'História' },
  { key: 'inventory', label: 'Inventário' },
  { key: 'kanban', label: 'Kanban' },
  { key: 'ideas', label: 'Ideias' },
  { key: 'references', label: 'Referências' },
] as const
type SectionKey = (typeof SECTION_DEFS)[number]['key']

export function ExportPage() {
  const { project } = useOutletContext<{ project: Project }>()
  const { data: modules, isLoading } = useGddModules(project.id)
  const { data: phases } = useProjectPhases(project.id)
  const { data: storyBlocks } = useStoryBlocks(project.id)
  const { data: invTypes } = useInventoryTypes(project.id)
  const { data: invItems } = useAllInventoryItems(project.id)
  const { data: kanbanBoards } = useKanbanBoards(project.id)
  const { data: kanbanColumns } = useAllKanbanColumns(project.id)
  const { data: kanbanCards } = useAllKanbanCards(project.id)
  const { data: ideas } = useIdeas(project.id)
  const { data: references } = useReferences(project.id)

  const [pickerOpen, setPickerOpen] = useState(false)
  const [includeGdd, setIncludeGdd] = useState(true)
  const [gddModuleIds, setGddModuleIds] = useState<Set<string>>(new Set())
  const [includeStory, setIncludeStory] = useState(true)
  const [storyBlockIds, setStoryBlockIds] = useState<Set<string>>(new Set())
  const [includeInventory, setIncludeInventory] = useState(true)
  const [inventoryTypeIds, setInventoryTypeIds] = useState<Set<string>>(new Set())
  const [includeKanban, setIncludeKanban] = useState(true)
  const [kanbanBoardIds, setKanbanBoardIds] = useState<Set<string>>(new Set())
  const [includeIdeas, setIncludeIdeas] = useState(true)
  const [includeReferences, setIncludeReferences] = useState(true)
  const [sectionOrder, setSectionOrder] = useState<SectionKey[]>(SECTION_DEFS.map((s) => s.key))

  // Sempre que os dados chegam, marca tudo (incluindo sub-módulos/sub-blocos) como selecionado por padrão.
  useEffect(() => {
    if (modules) setGddModuleIds(new Set(modules.map((m) => m.id)))
  }, [modules])
  useEffect(() => {
    if (storyBlocks) setStoryBlockIds(new Set(storyBlocks.map((b) => b.id)))
  }, [storyBlocks])
  useEffect(() => {
    if (invTypes) setInventoryTypeIds(new Set(invTypes.map((t) => t.id)))
  }, [invTypes])
  useEffect(() => {
    if (kanbanBoards) setKanbanBoardIds(new Set(kanbanBoards.map((b) => b.id)))
  }, [kanbanBoards])

  function toggleSet(set: Set<string>, setter: (s: Set<string>) => void, id: string) {
    const next = new Set(set)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setter(next)
  }

  function moveSection(index: number, dir: -1 | 1) {
    const target = index + dir
    if (target < 0 || target >= sectionOrder.length) return
    setSectionOrder((prev) => {
      const next = [...prev]
      const [item] = next.splice(index, 1)
      next.splice(target, 0, item)
      return next
    })
  }

  const gddChildrenByParent = useMemo(() => {
    const map = new Map<string, typeof modules>()
    for (const m of modules ?? []) {
      if (!m.parent_id) continue
      const list = map.get(m.parent_id) ?? []
      list.push(m)
      map.set(m.parent_id, list)
    }
    return map
  }, [modules])

  const storyChildrenByParent = useMemo(() => {
    const map = new Map<string, typeof storyBlocks>()
    for (const b of storyBlocks ?? []) {
      if (!b.parent_id) continue
      const list = map.get(b.parent_id) ?? []
      list.push(b)
      map.set(b.parent_id, list)
    }
    return map
  }, [storyBlocks])

  function buildDocument() {
    if (!project || !modules || !phases) return ''
    const fragmentsByKey: Partial<Record<SectionKey, string>> = {}
    if (includeGdd) {
      const included = modules.filter((m) => gddModuleIds.has(m.id))
      fragmentsByKey.gdd = buildGddModulesFragment(included, phases)
    }
    if (includeStory && storyBlocks) {
      const included = new Set([...storyBlockIds])
      fragmentsByKey.story = buildStoryFragment(
        storyBlocks.filter((b) => included.has(b.id)),
        'all',
      )
    }
    if (includeInventory && invTypes && invItems) {
      fragmentsByKey.inventory = buildInventoryFragment(invTypes, invItems, inventoryTypeIds)
    }
    if (includeKanban && kanbanBoards && kanbanColumns && kanbanCards) {
      fragmentsByKey.kanban = buildKanbanFragment(kanbanBoards, kanbanColumns, kanbanCards, kanbanBoardIds)
    }
    if (includeIdeas && ideas) fragmentsByKey.ideas = buildIdeasFragment(ideas)
    if (includeReferences && references) fragmentsByKey.references = buildReferencesFragment(references)

    const sections = sectionOrder.map((key) => fragmentsByKey[key]).filter((s): s is string => Boolean(s))
    return buildFullExportFragment(project, sections)
  }

  const fragment = buildDocument()

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-display text-2xl">Exportar</h1>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" icon={<ListChecks size={16} />} onClick={() => setPickerOpen(true)}>
            Escolher conteúdo
          </Button>
          <Link to={`/export/print/${project.id}`} target="_blank">
            <Button variant="ghost" size="sm" icon={<Printer size={16} />}>
              Ver para impressão / PDF
            </Button>
          </Link>
          <Button
            size="sm"
            icon={<Download size={16} />}
            disabled={isLoading}
            onClick={() => downloadHtml(`${project.slug}-export.html`, buildStandaloneHtml(project, fragment))}
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

      <Modal open={pickerOpen} onClose={() => setPickerOpen(false)} title="Escolher conteúdo do documento" wide>
        <div className="max-h-[65vh] space-y-5 overflow-y-auto pr-1">
          <section>
            <p className="text-label mb-2 text-[10px] text-canvas-fg/50">Ordem das seções no documento</p>
            <ul className="space-y-1">
              {sectionOrder.map((key, i) => (
                <li key={key} className="flex items-center gap-2 border-2 border-line/40 px-2 py-1">
                  <div className="flex flex-col">
                    <button
                      type="button"
                      disabled={i === 0}
                      onClick={() => moveSection(i, -1)}
                      aria-label="Mover para cima"
                      className="cursor-pointer text-canvas-fg/50 hover:text-canvas-fg disabled:opacity-20"
                    >
                      <ArrowUp size={11} />
                    </button>
                    <button
                      type="button"
                      disabled={i === sectionOrder.length - 1}
                      onClick={() => moveSection(i, 1)}
                      aria-label="Mover para baixo"
                      className="cursor-pointer text-canvas-fg/50 hover:text-canvas-fg disabled:opacity-20"
                    >
                      <ArrowDown size={11} />
                    </button>
                  </div>
                  <span className="text-xs text-canvas-fg">{SECTION_DEFS.find((s) => s.key === key)?.label}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <label className="flex items-center gap-2 text-sm font-semibold text-canvas-fg">
              <input type="checkbox" checked={includeGdd} onChange={(e) => setIncludeGdd(e.target.checked)} />
              Documento de Design (GDD)
            </label>
            {includeGdd && (
              <ul className="mt-2 ml-6 space-y-1.5">
                {(modules ?? [])
                  .filter((m) => !m.parent_id)
                  .map((m) => (
                    <li key={m.id}>
                      <label className="flex items-center gap-2 text-xs text-canvas-fg/80">
                        <input
                          type="checkbox"
                          checked={gddModuleIds.has(m.id)}
                          onChange={() => toggleSet(gddModuleIds, setGddModuleIds, m.id)}
                        />
                        {m.title}
                      </label>
                      {gddModuleIds.has(m.id) && (gddChildrenByParent.get(m.id) ?? []).length > 0 && (
                        <ul className="mt-1 ml-5 space-y-1">
                          {(gddChildrenByParent.get(m.id) ?? []).map((child) => (
                            <li key={child.id}>
                              <label className="flex items-center gap-1.5 text-xs text-canvas-fg/60">
                                <input
                                  type="checkbox"
                                  checked={gddModuleIds.has(child.id)}
                                  onChange={() => toggleSet(gddModuleIds, setGddModuleIds, child.id)}
                                />
                                <CornerDownRight size={10} className="shrink-0 opacity-50" />
                                {child.title}
                              </label>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
              </ul>
            )}
          </section>

          <section>
            <label className="flex items-center gap-2 text-sm font-semibold text-canvas-fg">
              <input type="checkbox" checked={includeStory} onChange={(e) => setIncludeStory(e.target.checked)} />
              História
            </label>
            {includeStory && (
              <ul className="mt-2 ml-6 space-y-1.5">
                {(storyBlocks ?? [])
                  .filter((b) => !b.parent_id)
                  .map((b) => (
                    <li key={b.id}>
                      <label className="flex items-center gap-2 text-xs text-canvas-fg/80">
                        <input
                          type="checkbox"
                          checked={storyBlockIds.has(b.id)}
                          onChange={() => toggleSet(storyBlockIds, setStoryBlockIds, b.id)}
                        />
                        {b.title}
                      </label>
                      {storyBlockIds.has(b.id) && (storyChildrenByParent.get(b.id) ?? []).length > 0 && (
                        <ul className="mt-1 ml-5 space-y-1">
                          {(storyChildrenByParent.get(b.id) ?? []).map((child) => (
                            <li key={child.id}>
                              <label className="flex items-center gap-1.5 text-xs text-canvas-fg/60">
                                <input
                                  type="checkbox"
                                  checked={storyBlockIds.has(child.id)}
                                  onChange={() => toggleSet(storyBlockIds, setStoryBlockIds, child.id)}
                                />
                                <CornerDownRight size={10} className="shrink-0 opacity-50" />
                                {child.title}
                              </label>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
              </ul>
            )}
          </section>

          <section>
            <label className="flex items-center gap-2 text-sm font-semibold text-canvas-fg">
              <input
                type="checkbox"
                checked={includeInventory}
                onChange={(e) => setIncludeInventory(e.target.checked)}
              />
              Inventário
            </label>
            {includeInventory && (
              <ul className="mt-2 ml-6 space-y-1">
                {(invTypes ?? []).map((t) => (
                  <li key={t.id}>
                    <label className="flex items-center gap-2 text-xs text-canvas-fg/80">
                      <input
                        type="checkbox"
                        checked={inventoryTypeIds.has(t.id)}
                        onChange={() => toggleSet(inventoryTypeIds, setInventoryTypeIds, t.id)}
                      />
                      {t.name}
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <label className="flex items-center gap-2 text-sm font-semibold text-canvas-fg">
              <input type="checkbox" checked={includeKanban} onChange={(e) => setIncludeKanban(e.target.checked)} />
              Kanban
            </label>
            {includeKanban && (
              <ul className="mt-2 ml-6 space-y-1">
                {(kanbanBoards ?? []).map((b) => (
                  <li key={b.id}>
                    <label className="flex items-center gap-2 text-xs text-canvas-fg/80">
                      <input
                        type="checkbox"
                        checked={kanbanBoardIds.has(b.id)}
                        onChange={() => toggleSet(kanbanBoardIds, setKanbanBoardIds, b.id)}
                      />
                      {b.name}
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <label className="flex items-center gap-2 text-sm font-semibold text-canvas-fg">
              <input type="checkbox" checked={includeIdeas} onChange={(e) => setIncludeIdeas(e.target.checked)} />
              Ideias
            </label>
          </section>

          <section>
            <label className="flex items-center gap-2 text-sm font-semibold text-canvas-fg">
              <input
                type="checkbox"
                checked={includeReferences}
                onChange={(e) => setIncludeReferences(e.target.checked)}
              />
              Referências
            </label>
          </section>
        </div>
        <div className="mt-4 flex justify-end">
          <Button size="sm" onClick={() => setPickerOpen(false)}>
            Aplicar
          </Button>
        </div>
      </Modal>
    </div>
  )
}
