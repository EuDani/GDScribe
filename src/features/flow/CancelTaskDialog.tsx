import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, Textarea } from '@/components/ui/Input'

export function CancelTaskDialog({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
}) {
  const [reason, setReason] = useState('')

  function handleClose() {
    setReason('')
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="Cancelar tarefa">
      <p className="mb-3 text-sm text-canvas-fg/70">Cancelar não é o mesmo que concluir. Essa tarefa sai do fluxo ativo.</p>
      <Field label="Motivo do cancelamento" hint="Opcional">
        <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex: funcionalidade removida do projeto" />
      </Field>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={handleClose}>
          Voltar
        </Button>
        <Button
          variant="danger"
          onClick={() => {
            onConfirm(reason.trim())
            setReason('')
          }}
        >
          Cancelar tarefa
        </Button>
      </div>
    </Modal>
  )
}
