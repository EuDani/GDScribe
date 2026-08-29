import { AnimatePresence, motion } from 'motion/react'
import { useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { createPortal } from 'react-dom'

interface SidePanelProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  isDirty?: boolean
}

/** Como o Modal, mas desliza da direita — pra conteúdo que fica melhor como painel lateral. */
export function SidePanel({ open, onClose, title, children, isDirty = false }: SidePanelProps) {
  const [confirmingDiscard, setConfirmingDiscard] = useState(false)

  function attemptClose() {
    if (isDirty) setConfirmingDiscard(true)
    else onClose()
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex justify-end bg-ink/80"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={attemptClose}
        >
          <motion.div
            className="text-canvas-fg relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l-2 border-line bg-surface shadow-brutal-lg"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b-2 border-line px-5 py-4">
              <h2 className="text-display text-lg">{title}</h2>
              <button
                type="button"
                onClick={attemptClose}
                aria-label="Fechar"
                className="cursor-pointer border-2 border-line bg-paper p-1 text-ink hover:bg-accent-red hover:text-canvas-fg"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 p-5">{children}</div>

            <AnimatePresence>
              {confirmingDiscard && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex items-center justify-center bg-ink/90 p-5"
                >
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="w-full max-w-xs border-2 border-line bg-surface p-4 text-center shadow-brutal-sm"
                  >
                    <p className="text-sm font-semibold text-canvas-fg">Descartar as alterações?</p>
                    <p className="mt-1 text-xs text-canvas-fg/60">Você preencheu algo que ainda não foi salvo.</p>
                    <div className="mt-3 flex justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmingDiscard(false)}
                        className="text-label cursor-pointer border-2 border-line px-3 py-1.5 text-[11px] text-canvas-fg/70 hover:text-canvas-fg"
                      >
                        Voltar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmingDiscard(false)
                          onClose()
                        }}
                        className="text-label cursor-pointer border-2 border-line bg-accent-red px-3 py-1.5 text-[11px] text-canvas-fg hover:bg-accent-red/80"
                      >
                        Descartar
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
