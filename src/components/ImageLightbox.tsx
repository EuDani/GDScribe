import { AnimatePresence, motion } from 'motion/react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useEffect } from 'react'

/** Modal em tela cheia pra ver uma imagem grande, com navegação entre uma lista. */
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

  return createPortal(
    <AnimatePresence>
      {open && index !== null && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/95 p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="absolute right-4 top-4 cursor-pointer border-2 border-line bg-paper p-1.5 text-ink hover:bg-accent-red hover:text-canvas-fg"
          >
            <X size={18} />
          </button>

          {images.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onIndexChange((index - 1 + images.length) % images.length)
              }}
              aria-label="Imagem anterior"
              className="absolute left-4 top-1/2 -translate-y-1/2 cursor-pointer border-2 border-line bg-paper p-2 text-ink hover:bg-accent-yellow"
            >
              <ChevronLeft size={20} />
            </button>
          )}

          <motion.img
            key={images[index]}
            src={images[index]}
            alt=""
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] max-w-[85vw] border-2 border-line object-contain shadow-brutal-lg"
          />

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onIndexChange((index + 1) % images.length)
                }}
                aria-label="Próxima imagem"
                className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer border-2 border-line bg-paper p-2 text-ink hover:bg-accent-yellow"
              >
                <ChevronRight size={20} />
              </button>
              <div className="text-label absolute bottom-4 left-1/2 -translate-x-1/2 border-2 border-line bg-paper px-2 py-1 text-[11px] text-ink">
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
