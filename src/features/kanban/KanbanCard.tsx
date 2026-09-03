import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CalendarDays, CheckSquare } from 'lucide-react'
import { motion } from 'motion/react'
import type { KanbanCard as KanbanCardType } from '@/lib/types'
import { Badge, accentFromString } from '@/components/ui/Badge'
import { CardIcon } from '@/lib/iconMap'

function formatDate(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y.slice(2)}`
}

export function KanbanCardFace({ card }: { card: KanbanCardType }) {
  const doneCount = card.checklist.filter((i) => i.done).length
  const overdue = card.due_date ? new Date(card.due_date) < new Date(new Date().toDateString()) : false

  return (
    <>
      {card.cover_image_url && (
        <img src={card.cover_image_url} alt="" className="h-24 w-full border-b-2 border-line object-cover" />
      )}
      <div className="p-3">
        <div className="flex items-start gap-1.5">
          {card.icon && <span className="mt-0.5 shrink-0">{<CardIcon name={card.icon} size={14} />}</span>}
          <p className="text-sm font-semibold">{card.title}</p>
        </div>
        {card.description && (
          <p className="mt-1 line-clamp-2 text-xs text-ink/60">{card.description}</p>
        )}

        {(card.checklist.length > 0 || card.due_date) && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-ink/60">
            {card.checklist.length > 0 && (
              <span className="flex items-center gap-1">
                <CheckSquare size={12} />
                {doneCount}/{card.checklist.length}
              </span>
            )}
            {card.due_date && (
              <span className={`flex items-center gap-1 ${overdue ? 'text-accent-red' : ''}`}>
                <CalendarDays size={12} />
                {formatDate(card.due_date)}
              </span>
            )}
          </div>
        )}

        {card.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {card.tags.map((tag) => (
              <Badge key={tag} accent={accentFromString(tag)}>
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

export function KanbanCardView({
  card,
  onClick,
}: {
  card: KanbanCardType
  onClick: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: 'card', columnId: card.column_id },
    transition: { duration: 220, easing: 'cubic-bezier(0.2, 0, 0, 1)' },
  })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="cursor-grab touch-none active:cursor-grabbing"
    >
      {/* A animação de scale/sombra fica num wrapper à parte do que o
          dnd-kit controla — o framer-motion também gerencia a propriedade
          CSS transform quando anima scale, e misturar isso com o transform
          de posição do dnd-kit no mesmo elemento faz um pisar no pé do
          outro (um deles simplesmente para de fazer efeito). */}
      <motion.div
        animate={{ scale: isDragging ? 1.04 : 1, opacity: isDragging ? 0.5 : 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="overflow-hidden border-2 border-line bg-paper text-ink shadow-brutal-sm"
      >
        <KanbanCardFace card={card} />
      </motion.div>
    </div>
  )
}
