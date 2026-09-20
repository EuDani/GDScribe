import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Upload } from 'lucide-react'
import { motion } from 'motion/react'
import { Badge, accentFromString } from '@/components/ui/Badge'
import type { GameReference } from '@/lib/types'

export function ReferenceCard({ reference, onClick }: { reference: GameReference; onClick: () => void }) {
  const done = reference.checklist.filter((c) => c.done).length
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: reference.id,
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
      <motion.div
        animate={{ scale: isDragging ? 1.04 : 1, opacity: isDragging ? 0.5 : 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        whileHover={isDragging ? undefined : { x: -2, y: -2 }}
        className="cursor-pointer overflow-hidden border-2 border-line bg-surface text-left shadow-brutal-sm"
      >
        {(reference.image_urls[0] ?? reference.image_url) ? (
          <img
            src={reference.image_urls[0] ?? reference.image_url ?? undefined}
            alt=""
            className="h-28 w-full border-b-2 border-line object-cover"
          />
        ) : (
          <div className="flex h-28 w-full items-center justify-center border-b-2 border-line bg-canvas text-canvas-fg/20">
            <Upload size={22} />
          </div>
        )}
        <div className="p-3">
          <h3 className="text-display truncate text-sm">{reference.title}</h3>
          {reference.checklist.length > 0 && (
            <p className="text-label mt-1 text-[10px] text-canvas-fg/50">
              {done}/{reference.checklist.length} itens marcados
            </p>
          )}
          {reference.tags.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {reference.tags.map((tag) => (
                <Badge key={tag} accent={accentFromString(tag)}>
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
