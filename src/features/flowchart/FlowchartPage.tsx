import { useEffect, useMemo, useRef, useState } from 'react'
import { Pencil, Plus, Trash2, Workflow } from 'lucide-react'
import { clsx } from 'clsx'
import { useOutletContext } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Field, TextInput } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import type { Flowchart, FlowchartEdge, FlowchartNode, Project } from '@/lib/types'
import {
  useCreateFlowchart,
  useDeleteFlowchart,
  useFlowcharts,
  useRenameFlowchart,
  useUpdateFlowchartContent,
} from '@/features/flowchart/useFlowcharts'

const NODE_COLORS = [
  'var(--color-accent-yellow)',
  'var(--color-accent-blue)',
  'var(--color-accent-red)',
  'var(--color-accent-green)',
  'var(--color-accent-purple)',
]

const NODE_WIDTH = 160
const NODE_HEIGHT = 64

function newNode(x: number, y: number): FlowchartNode {
  return {
    id: crypto.randomUUID(),
    x,
    y,
    width: NODE_WIDTH,
    height: NODE_HEIGHT,
    text: 'Novo passo',
    color: NODE_COLORS[Math.floor(Math.random() * NODE_COLORS.length)],
  }
}

export function FlowchartPage() {
  const { project } = useOutletContext<{ project: Project }>()
  const { data: flowcharts, isLoading } = useFlowcharts(project.id)
  const createFlowchart = useCreateFlowchart(project.id)
  const renameFlowchart = useRenameFlowchart(project.id)
  const deleteFlowchart = useDeleteFlowchart(project.id)

  const [activeId, setActiveId] = useState<string | null>(null)
  const active = flowcharts?.find((f) => f.id === activeId) ?? flowcharts?.[0] ?? null

  const [boardModalOpen, setBoardModalOpen] = useState(false)
  const [editingBoardId, setEditingBoardId] = useState<string | null>(null)
  const [boardName, setBoardName] = useState('')
  const [pendingDeleteBoard, setPendingDeleteBoard] = useState<string | null>(null)

  function openCreateBoard() {
    setEditingBoardId(null)
    setBoardName('')
    setBoardModalOpen(true)
  }

  function openRenameBoard(id: string, name: string) {
    setEditingBoardId(id)
    setBoardName(name)
    setBoardModalOpen(true)
  }

  async function handleSaveBoard(e: React.FormEvent) {
    e.preventDefault()
    if (!boardName.trim()) return
    if (editingBoardId) await renameFlowchart.mutateAsync({ id: editingBoardId, name: boardName.trim() })
    else {
      const created = await createFlowchart.mutateAsync(boardName.trim())
      setActiveId(created.id)
    }
    setBoardModalOpen(false)
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-display flex items-center gap-2 text-2xl">
          <Workflow size={22} /> Fluxograma
        </h1>
      </div>

      {isLoading && <p className="text-label text-sm text-canvas-fg/50">Carregando…</p>}

      {!isLoading && (flowcharts ?? []).length === 0 && (
        <EmptyState
          title="Nenhum fluxograma ainda"
          description="Crie fluxos de sistemas, progressão, diálogos — o que fizer sentido pro seu jogo."
          action={
            <Button icon={<Plus size={16} />} onClick={openCreateBoard}>
              Criar fluxograma
            </Button>
          }
        />
      )}

      {!isLoading && (flowcharts ?? []).length > 0 && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-1.5">
            {flowcharts?.map((f) => (
              <div key={f.id} className="group flex items-center">
                <button
                  type="button"
                  onClick={() => setActiveId(f.id)}
                  className={clsx(
                    'text-label cursor-pointer border-2 px-3 py-1.5 text-xs font-semibold',
                    active?.id === f.id
                      ? 'border-line bg-accent-yellow text-ink shadow-brutal-sm'
                      : 'border-line/40 bg-surface text-canvas-fg/70 hover:border-line',
                  )}
                >
                  {f.name}
                </button>
                <button
                  type="button"
                  onClick={() => openRenameBoard(f.id, f.name)}
                  aria-label="Renomear fluxograma"
                  className="ml-0.5 cursor-pointer p-1 text-canvas-fg/30 opacity-0 group-hover:opacity-100 hover:text-canvas-fg"
                >
                  <Pencil size={11} />
                </button>
                <button
                  type="button"
                  onClick={() => setPendingDeleteBoard(f.id)}
                  aria-label="Excluir fluxograma"
                  className="cursor-pointer p-1 text-canvas-fg/30 opacity-0 group-hover:opacity-100 hover:text-accent-red"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
            <Button size="sm" variant="ghost" icon={<Plus size={13} />} onClick={openCreateBoard}>
              Novo fluxograma
            </Button>
          </div>

          {active && <FlowchartCanvas key={active.id} projectId={project.id} flowchart={active} />}
        </>
      )}

      <Modal
        open={boardModalOpen}
        onClose={() => setBoardModalOpen(false)}
        title={editingBoardId ? 'Renomear fluxograma' : 'Novo fluxograma'}
        isDirty={
          editingBoardId ? boardName !== flowcharts?.find((f) => f.id === editingBoardId)?.name : Boolean(boardName.trim())
        }
      >
        <form onSubmit={handleSaveBoard}>
          <Field label="Nome" hint="Ex: Progressão do personagem, Diálogo do NPC X…">
            <TextInput required autoFocus value={boardName} onChange={(e) => setBoardName(e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setBoardModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Salvar</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDeleteBoard)}
        onClose={() => setPendingDeleteBoard(null)}
        onConfirm={() => {
          if (pendingDeleteBoard) deleteFlowchart.mutate(pendingDeleteBoard)
          setActiveId(null)
        }}
        title="Excluir fluxograma"
        description="Essa ação não pode ser desfeita."
        confirmLabel="Excluir"
      />
    </div>
  )
}

type DragState =
  | { kind: 'node'; nodeId: string; offsetX: number; offsetY: number }
  | { kind: 'connect'; fromId: string; x: number; y: number }
  | null

function clipToRect(cx: number, cy: number, node: FlowchartNode, towardX: number, towardY: number) {
  const dx = towardX - cx
  const dy = towardY - cy
  if (dx === 0 && dy === 0) return { x: cx, y: cy }
  const halfW = node.width / 2
  const halfH = node.height / 2
  const scale = Math.min(halfW / Math.abs(dx || 1e-6), halfH / Math.abs(dy || 1e-6))
  return { x: cx + dx * scale, y: cy + dy * scale }
}

function FlowchartCanvas({ projectId, flowchart }: { projectId: string; flowchart: Flowchart }) {
  const updateContent = useUpdateFlowchartContent(projectId)
  const [nodes, setNodes] = useState<FlowchartNode[]>(flowchart.nodes)
  const [edges, setEdges] = useState<FlowchartEdge[]>(flowchart.edges)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const [drag, setDrag] = useState<DragState>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const dirtyRef = useRef(false)

  useEffect(() => {
    if (!dirtyRef.current) return
    const t = setTimeout(() => {
      updateContent.mutate({ id: flowchart.id, nodes, edges })
      dirtyRef.current = false
    }, 600)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges])

  function markDirty() {
    dirtyRef.current = true
  }

  function getCanvasPoint(e: { clientX: number; clientY: number }) {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return { x: e.clientX - rect.left + (canvasRef.current?.scrollLeft ?? 0), y: e.clientY - rect.top + (canvasRef.current?.scrollTop ?? 0) }
  }

  function addNode() {
    const point = { x: 60 + (nodes.length % 5) * 40, y: 40 + Math.floor(nodes.length / 5) * 100 }
    setNodes((prev) => [...prev, newNode(point.x, point.y)])
    markDirty()
  }

  function updateNodeText(id: string, text: string) {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, text } : n)))
    markDirty()
  }

  function setNodeColor(id: string, color: string) {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, color } : n)))
    markDirty()
  }

  function deleteNode(id: string) {
    setNodes((prev) => prev.filter((n) => n.id !== id))
    setEdges((prev) => prev.filter((e) => e.from !== id && e.to !== id))
    setSelectedNodeId(null)
    markDirty()
  }

  function deleteEdge(id: string) {
    setEdges((prev) => prev.filter((e) => e.id !== id))
    setSelectedEdgeId(null)
    markDirty()
  }

  function handleNodePointerDown(e: React.PointerEvent, node: FlowchartNode) {
    if (editingNodeId === node.id) return
    e.stopPropagation()
    setSelectedNodeId(node.id)
    setSelectedEdgeId(null)
    const point = getCanvasPoint(e)
    setDrag({ kind: 'node', nodeId: node.id, offsetX: point.x - node.x, offsetY: point.y - node.y })
  }

  function handleHandlePointerDown(e: React.PointerEvent, node: FlowchartNode) {
    e.stopPropagation()
    const point = getCanvasPoint(e)
    setDrag({ kind: 'connect', fromId: node.id, x: point.x, y: point.y })
  }

  function handleCanvasPointerMove(e: React.PointerEvent) {
    if (!drag) return
    const point = getCanvasPoint(e)
    if (drag.kind === 'node') {
      setNodes((prev) =>
        prev.map((n) => (n.id === drag.nodeId ? { ...n, x: point.x - drag.offsetX, y: point.y - drag.offsetY } : n)),
      )
    } else if (drag.kind === 'connect') {
      setDrag({ ...drag, x: point.x, y: point.y })
    }
  }

  function handleCanvasPointerUp(e: React.PointerEvent) {
    if (!drag) return
    if (drag.kind === 'node') {
      markDirty()
    } else if (drag.kind === 'connect') {
      const point = getCanvasPoint(e)
      const target = nodes.find(
        (n) =>
          point.x >= n.x - n.width / 2 &&
          point.x <= n.x + n.width / 2 &&
          point.y >= n.y - n.height / 2 &&
          point.y <= n.y + n.height / 2,
      )
      if (target && target.id !== drag.fromId) {
        const exists = edges.some((ed) => ed.from === drag.fromId && ed.to === target.id)
        if (!exists) {
          setEdges((prev) => [...prev, { id: crypto.randomUUID(), from: drag.fromId, to: target.id }])
          markDirty()
        }
      }
    }
    setDrag(null)
  }

  function handleCanvasClick() {
    setSelectedNodeId(null)
    setSelectedEdgeId(null)
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (editingNodeId) return
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeId) deleteNode(selectedNodeId)
        else if (selectedEdgeId) deleteEdge(selectedEdgeId)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNodeId, selectedEdgeId, editingNodeId])

  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])

  const bounds = useMemo(() => {
    const maxX = Math.max(900, ...nodes.map((n) => n.x + n.width + 100))
    const maxY = Math.max(560, ...nodes.map((n) => n.y + n.height + 100))
    return { width: maxX, height: maxY }
  }, [nodes])

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-label text-[10px] text-canvas-fg/40">
          Arraste um nó pra mover · arraste a partir da bolinha na borda pra conectar · clique num nó/seta e aperte
          Delete pra excluir · duplo clique pra editar o texto
        </p>
        <Button size="sm" icon={<Plus size={14} />} onClick={addNode}>
          Novo nó
        </Button>
      </div>

      <div
        ref={canvasRef}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handleCanvasPointerUp}
        onClick={handleCanvasClick}
        className="relative max-h-[70vh] overflow-auto border-2 border-line bg-surface"
        style={{
          backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          color: 'var(--color-canvas-fg)',
        }}
      >
        <div style={{ width: bounds.width, height: bounds.height, position: 'relative' }}>
          <svg
            width={bounds.width}
            height={bounds.height}
            className="pointer-events-none absolute left-0 top-0"
            style={{ color: 'transparent' }}
          >
            <defs>
              <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                <path d="M0,0 L8,4 L0,8 Z" fill="var(--color-line)" />
              </marker>
            </defs>
            {edges.map((edge) => {
              const from = nodeById.get(edge.from)
              const to = nodeById.get(edge.to)
              if (!from || !to) return null
              const start = clipToRect(from.x, from.y, from, to.x, to.y)
              const end = clipToRect(to.x, to.y, to, from.x, from.y)
              const midX = (start.x + end.x) / 2
              const midY = (start.y + end.y) / 2
              return (
                <g key={edge.id}>
                  <line
                    x1={start.x}
                    y1={start.y}
                    x2={end.x}
                    y2={end.y}
                    stroke="transparent"
                    strokeWidth={14}
                    className="pointer-events-auto cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedEdgeId(edge.id)
                      setSelectedNodeId(null)
                    }}
                  />
                  <line
                    x1={start.x}
                    y1={start.y}
                    x2={end.x}
                    y2={end.y}
                    stroke={selectedEdgeId === edge.id ? 'var(--color-accent-red)' : 'var(--color-line)'}
                    strokeWidth={selectedEdgeId === edge.id ? 3 : 2}
                    markerEnd="url(#arrowhead)"
                  />
                  {selectedEdgeId === edge.id && (
                    <circle
                      cx={midX}
                      cy={midY}
                      r={9}
                      fill="var(--color-accent-red)"
                      stroke="var(--color-line)"
                      strokeWidth={2}
                      className="pointer-events-auto cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteEdge(edge.id)
                      }}
                    />
                  )}
                </g>
              )
            })}
            {drag?.kind === 'connect' && (
              <line
                x1={nodeById.get(drag.fromId)?.x ?? 0}
                y1={nodeById.get(drag.fromId)?.y ?? 0}
                x2={drag.x}
                y2={drag.y}
                stroke="var(--color-accent-yellow)"
                strokeWidth={2}
                strokeDasharray="4 4"
              />
            )}
          </svg>

          {nodes.map((node) => (
            <div
              key={node.id}
              onPointerDown={(e) => handleNodePointerDown(e, node)}
              onClick={(e) => e.stopPropagation()}
              onDoubleClick={(e) => {
                e.stopPropagation()
                setEditingNodeId(node.id)
              }}
              className={clsx(
                'absolute flex cursor-grab touch-none items-center justify-center border-2 p-2 text-center text-xs font-semibold text-ink shadow-brutal-sm active:cursor-grabbing',
                selectedNodeId === node.id ? 'border-accent-red' : 'border-line',
              )}
              style={{
                left: node.x - node.width / 2,
                top: node.y - node.height / 2,
                width: node.width,
                height: node.height,
                backgroundColor: node.color,
              }}
            >
              {editingNodeId === node.id ? (
                <textarea
                  autoFocus
                  defaultValue={node.text}
                  onPointerDown={(e) => e.stopPropagation()}
                  onBlur={(e) => {
                    updateNodeText(node.id, e.target.value.trim() || 'Sem texto')
                    setEditingNodeId(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      e.currentTarget.blur()
                    }
                    if (e.key === 'Escape') setEditingNodeId(null)
                  }}
                  className="h-full w-full resize-none bg-transparent text-center text-xs outline-none"
                />
              ) : (
                <span className="pointer-events-none">{node.text}</span>
              )}

              {selectedNodeId === node.id && editingNodeId !== node.id && (
                <>
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteNode(node.id)
                    }}
                    aria-label="Excluir nó"
                    className="absolute -right-2 -top-2 cursor-pointer border-2 border-line bg-accent-red p-0.5 text-canvas-fg"
                  >
                    <Trash2 size={10} />
                  </button>
                  <div
                    className="absolute -bottom-6 left-1/2 flex -translate-x-1/2 gap-1"
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    {NODE_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setNodeColor(node.id, color)
                        }}
                        aria-label="Mudar cor"
                        className="h-3 w-3 cursor-pointer border border-line"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  {/* handles de conexão */}
                  {[
                    { x: node.width / 2, y: 0 },
                    { x: node.width / 2, y: node.height },
                    { x: 0, y: node.height / 2 },
                    { x: node.width, y: node.height / 2 },
                  ].map((h, i) => (
                    <div
                      key={i}
                      onPointerDown={(e) => handleHandlePointerDown(e, node)}
                      className="absolute h-2.5 w-2.5 cursor-crosshair rounded-full border border-line bg-canvas"
                      style={{ left: h.x - 5, top: h.y - 5 }}
                    />
                  ))}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
