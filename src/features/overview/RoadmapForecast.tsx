import { useMemo } from 'react'
import { AlertTriangle, CalendarCheck, TrendingUp } from 'lucide-react'
import type { KanbanCard, KanbanColumn, Project } from '@/lib/types'

const DAY_MS = 86_400_000

function formatDate(d: Date) {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** Última coluna (por ordem) de cada quadro conta como "concluído" — mesma
 * convenção já usada na Visão Geral e no Calendário pros cards pendentes. */
function computeDoneColumnIds(columns: KanbanColumn[]): Set<string> {
  const byBoard = new Map<string, KanbanColumn[]>()
  for (const c of columns) {
    const list = byBoard.get(c.board_id) ?? []
    list.push(c)
    byBoard.set(c.board_id, list)
  }
  const doneIds = new Set<string>()
  for (const list of byBoard.values()) {
    const sorted = [...list].sort((a, b) => a.sort_order - b.sort_order)
    const last = sorted.at(-1)
    if (last) doneIds.add(last.id)
  }
  return doneIds
}

export function RoadmapForecast({
  project,
  cards,
  columns,
}: {
  project: Project
  cards: KanbanCard[]
  columns: KanbanColumn[]
}) {
  const forecast = useMemo(() => {
    const doneColumnIds = computeDoneColumnIds(columns)
    const withHours = cards.filter((c) => c.estimated_hours !== null)
    const doneCards = withHours
      .filter((c) => doneColumnIds.has(c.column_id) && c.completed_at)
      .sort((a, b) => (a.completed_at! < b.completed_at! ? -1 : 1))
    const remainingCards = withHours.filter((c) => !doneColumnIds.has(c.column_id))

    const remainingHours = remainingCards.reduce((s, c) => s + (c.estimated_hours ?? 0), 0)
    const completedHours = doneCards.reduce((s, c) => s + (c.estimated_hours ?? 0), 0)
    const grandTotalHours = remainingHours + completedHours
    const cardsWithoutHours = cards.length - withHours.length

    if (doneCards.length < 2 || completedHours <= 0) {
      return {
        ready: false as const,
        cardsWithoutHours,
        totalCards: cards.length,
      }
    }

    const firstDate = new Date(doneCards[0].completed_at!)
    const lastDate = new Date(doneCards.at(-1)!.completed_at!)
    const daysElapsed = Math.max(1, (lastDate.getTime() - firstDate.getTime()) / DAY_MS)
    const velocityPerDay = completedHours / daysElapsed

    const today = new Date()
    let projectedDate: Date | null = null
    if (velocityPerDay > 0) {
      const projectedDays = remainingHours / velocityPerDay
      projectedDate = new Date(today.getTime() + projectedDays * DAY_MS)
    }

    const targetDate = project.target_release_date ? new Date(project.target_release_date) : null
    const diffDays =
      projectedDate && targetDate ? Math.round((projectedDate.getTime() - targetDate.getTime()) / DAY_MS) : null

    // Pontos do burndown histórico: total no início, descendo a cada card concluído.
    const historyPoints: { date: Date; hoursRemaining: number }[] = [{ date: firstDate, hoursRemaining: grandTotalHours }]
    let running = grandTotalHours
    for (const c of doneCards) {
      running -= c.estimated_hours ?? 0
      historyPoints.push({ date: new Date(c.completed_at!), hoursRemaining: Math.max(0, running) })
    }

    return {
      ready: true as const,
      remainingHours,
      completedHours,
      grandTotalHours,
      velocityPerDay,
      projectedDate,
      targetDate,
      diffDays,
      historyPoints,
      today,
      cardsWithoutHours,
      totalCards: cards.length,
    }
  }, [project.target_release_date, cards, columns])

  if (cards.filter((c) => c.estimated_hours !== null).length === 0) {
    return (
      <div className="border-2 border-line bg-surface p-4">
        <h2 className="text-display mb-2 flex items-center gap-2 text-sm">
          <TrendingUp size={16} /> Roadmap de conclusão
        </h2>
        <p className="text-xs text-canvas-fg/40">
          Adicione "Horas estimadas" nos cards do Kanban pra ver a previsão de quando o projeto vai ficar pronto.
        </p>
      </div>
    )
  }

  if (!forecast.ready) {
    return (
      <div className="border-2 border-line bg-surface p-4">
        <h2 className="text-display mb-2 flex items-center gap-2 text-sm">
          <TrendingUp size={16} /> Roadmap de conclusão
        </h2>
        <p className="text-xs text-canvas-fg/40">
          Ainda não há dados suficientes — conclua pelo menos 2 cards com horas estimadas (movendo pra última coluna
          de um quadro) pra calcular o ritmo do projeto.
        </p>
      </div>
    )
  }

  const { remainingHours, velocityPerDay, projectedDate, targetDate, diffDays, historyPoints, today, grandTotalHours } =
    forecast

  // monta o SVG do burndown: eixo X = tempo, eixo Y = horas restantes (invertido, desce até 0)
  const width = 640
  const height = 180
  const padding = { top: 10, right: 16, bottom: 22, left: 36 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  const allDates = [...historyPoints.map((p) => p.date), today, ...(projectedDate ? [projectedDate] : []), ...(targetDate ? [targetDate] : [])]
  const minTime = Math.min(...allDates.map((d) => d.getTime()))
  const maxTime = Math.max(...allDates.map((d) => d.getTime()))
  const timeSpan = Math.max(1, maxTime - minTime)

  function xFor(d: Date) {
    return padding.left + ((d.getTime() - minTime) / timeSpan) * chartW
  }
  function yFor(hours: number) {
    return padding.top + chartH - (Math.min(hours, grandTotalHours) / grandTotalHours) * chartH
  }

  const historyPath = historyPoints.map((p) => `${xFor(p.date)},${yFor(p.hoursRemaining)}`).join(' L ')
  const projectedPath = projectedDate
    ? `M ${xFor(today)},${yFor(remainingHours)} L ${xFor(projectedDate)},${yFor(0)}`
    : ''

  const onTrack = diffDays !== null && diffDays <= 0

  return (
    <div className="border-2 border-line bg-surface p-4">
      <h2 className="text-display mb-3 flex items-center gap-2 text-sm">
        <TrendingUp size={16} /> Roadmap de conclusão
      </h2>

      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex items-start gap-2">
          <CalendarCheck size={16} className="mt-0.5 shrink-0 text-accent-blue" />
          <div>
            <p className="text-sm text-canvas-fg">
              Seguindo o ritmo atual (~{velocityPerDay.toFixed(1)}h/dia), você termina em{' '}
              <span className="font-semibold">{projectedDate ? formatDate(projectedDate) : '—'}</span>.
            </p>
            {targetDate && diffDays !== null && (
              <p className={`mt-1 flex items-center gap-1.5 text-xs font-semibold ${onTrack ? 'text-accent-green' : 'text-accent-red'}`}>
                {!onTrack && <AlertTriangle size={12} />}
                {onTrack
                  ? `${Math.abs(diffDays)} dia(s) antes da data de lançamento prevista (${formatDate(targetDate)})`
                  : `${diffDays} dia(s) depois da data de lançamento prevista (${formatDate(targetDate)})`}
              </p>
            )}
            {!targetDate && (
              <p className="mt-1 text-xs text-canvas-fg/40">
                Defina a "Data prevista de lançamento" em Configurações pra comparar.
              </p>
            )}
          </div>
        </div>
        <div className="text-xs text-canvas-fg/60">
          <p>
            <span className="text-canvas-fg/40">Restam:</span> {remainingHours}h
          </p>
          <p>
            <span className="text-canvas-fg/40">Concluídas:</span> {forecast.completedHours}h
          </p>
          {forecast.cardsWithoutHours > 0 && (
            <p className="mt-1 text-canvas-fg/40">{forecast.cardsWithoutHours} card(s) sem horas estimadas não entram na conta.</p>
          )}
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
        {/* eixo Y de referência */}
        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + chartH} stroke="var(--color-line)" strokeOpacity={0.3} />
        <line
          x1={padding.left}
          y1={padding.top + chartH}
          x2={width - padding.right}
          y2={padding.top + chartH}
          stroke="var(--color-line)"
          strokeOpacity={0.3}
        />
        <text x={4} y={padding.top + 4} className="text-[9px]" fill="var(--color-canvas-fg)" opacity={0.5}>
          {grandTotalHours}h
        </text>
        <text x={4} y={padding.top + chartH} className="text-[9px]" fill="var(--color-canvas-fg)" opacity={0.5}>
          0h
        </text>

        {/* linha histórica (real) */}
        <polyline points={historyPath} fill="none" stroke="var(--color-accent-blue)" strokeWidth={2} />
        {historyPoints.map((p, i) => (
          <circle key={i} cx={xFor(p.date)} cy={yFor(p.hoursRemaining)} r={2.5} fill="var(--color-accent-blue)" />
        ))}

        {/* linha projetada (tendência) */}
        {projectedPath && <path d={projectedPath} fill="none" stroke="var(--color-accent-yellow)" strokeWidth={2} strokeDasharray="5 4" />}

        {/* marcador de hoje */}
        <line
          x1={xFor(today)}
          y1={padding.top}
          x2={xFor(today)}
          y2={padding.top + chartH}
          stroke="var(--color-canvas-fg)"
          strokeOpacity={0.2}
          strokeDasharray="2 3"
        />

        {/* marcador de lançamento previsto */}
        {targetDate && (
          <>
            <line
              x1={xFor(targetDate)}
              y1={padding.top}
              x2={xFor(targetDate)}
              y2={padding.top + chartH}
              stroke="var(--color-accent-red)"
              strokeWidth={1.5}
            />
            <text x={xFor(targetDate)} y={height - 6} textAnchor="middle" className="text-[9px]" fill="var(--color-accent-red)">
              Lançamento
            </text>
          </>
        )}

        {/* marcador de previsão */}
        {projectedDate && (
          <>
            <circle cx={xFor(projectedDate)} cy={yFor(0)} r={3.5} fill="var(--color-accent-yellow)" stroke="var(--color-line)" strokeWidth={1} />
            <text
              x={xFor(projectedDate)}
              y={height - 6}
              textAnchor="middle"
              className="text-[9px]"
              fill="var(--color-accent-yellow)"
            >
              Previsão
            </text>
          </>
        )}
      </svg>
    </div>
  )
}
