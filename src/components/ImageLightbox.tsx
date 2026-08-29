import { AnimatePresence, motion } from 'motion/react'
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useEffect, useRef, useState } from 'react'

const MIN_ZOOM = 1
const MAX_ZOOM = 6

/** Modal em tela cheia pra ver uma imagem grande, com navegação entre uma
 * lista, zoom com a roda do mouse e arraste pra mover quando ampliada. */
export function ImageLightbox({
  images,
  index,
  onClose,
  onIndexChange,
}: {
  images: string[]
  index: number | null
  onClose: () => void
  onIndexChange: (index: number) => void
}) {
  const open = index !== null
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const dragRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null)

  useEffect(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [index])

  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') onIndexChange(((index! - 1) + images.length) % images.length)
      else if (e.key === 'ArrowRight') onIndexChange((index! + 1) % images.length)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, index, images.length, onClose, onIndexChange])

  function clampZoom(z: number) {
    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z))
  }

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault()
    setZoom((prev) => {
      const next = clampZoom(prev - e.deltaY * 0.0015 * prev)
      if (next === MIN_ZOOM) setPan({ x: 0, y: 0 })
      return next
    })
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (zoom <= MIN_ZOOM) return
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y }
    setIsPanning(true)
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return
    e.stopPropagation()
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    setPan({ x: dragRef.current.panX + dx, y: dragRef.current.panY + dy })
  }

  function handlePointerUp() {
    dragRef.current = null
    setIsPanning(false)
  }

  function zoomBy(amount: number) {
    setZoom((prev) => {
      const next = clampZoom(prev + amount)
      if (next === MIN_ZOOM) setPan({ x: 0, y: 0 })
      return next
    })
  }

  return createPortal(
    <AnimatePresence>
      {open && index !== null && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden bg-ink/95 p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="absolute right-4 top-4 z-10 cursor-pointer border-2 border-line bg-paper p-1.5 text-ink hover:bg-accent-red hover:text-canvas-fg"
          >
            <X size={18} />
          </button>

          <div className="absolute left-4 top-4 z-10 flex gap-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                zoomBy(-0.5)
              }}
              disabled={zoom <= MIN_ZOOM}
              aria-label="Diminuir zoom"
              className="cursor-pointer border-2 border-line bg-paper p-1.5 text-ink hover:bg-accent-yellow disabled:cursor-default disabled:opacity-30"
            >
              <ZoomOut size={16} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                zoomBy(0.5)
              }}
              disabled={zoom >= MAX_ZOOM}
              aria-label="Aumentar zoom"
              className="cursor-pointer border-2 border-line bg-paper p-1.5 text-ink hover:bg-accent-yellow disabled:cursor-default disabled:opacity-30"
            >
              <ZoomIn size={16} />
            </button>
          </div>

          {images.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onIndexChange((index - 1 + images.length) % images.length)
              }}
              aria-label="Imagem anterior"
              className="absolute left-4 top-1/2 z-10 -translate-y-1/2 cursor-pointer border-2 border-line bg-paper p-2 text-ink hover:bg-accent-yellow"
            >
              <ChevronLeft size={20} />
            </button>
          )}

          <div
            className="flex h-full w-full items-center justify-center"
            onWheel={handleWheel}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onClick={(e) => e.stopPropagation()}
            style={{ cursor: zoom > MIN_ZOOM ? (isPanning ? 'grabbing' : 'grab') : 'default', touchAction: 'none' }}
          >
            <motion.img
              key={images[index]}
              src={images[index]}
              alt=""
              draggable={false}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="max-h-[85vh] max-w-[85vw] border-2 border-line object-contain shadow-brutal-lg select-none"
              style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transition: isPanning ? 'none' : 'transform 0.1s' }}
            />
          </div>

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onIndexChange((index + 1) % images.length)
                }}
                aria-label="Próxima imagem"
                className="absolute right-4 top-1/2 z-10 -translate-y-1/2 cursor-pointer border-2 border-line bg-paper p-2 text-ink hover:bg-accent-yellow"
              >
                <ChevronRight size={20} />
              </button>
              <div className="text-label absolute bottom-4 left-1/2 z-10 -translate-x-1/2 border-2 border-line bg-paper px-2 py-1 text-[11px] text-ink">
                {index + 1} / {images.length}
              </div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
