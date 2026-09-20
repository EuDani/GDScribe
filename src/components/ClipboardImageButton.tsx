import { ClipboardPaste } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'

/**
 * Botão que lê a área de transferência (Clipboard API) e, se houver uma
 * imagem, chama onImage com ela — sem precisar focar um campo e apertar
 * Ctrl+V. Fica ao lado de todo botão de "enviar imagem" do app.
 */
export function ClipboardImageButton({
  onImage,
  label = 'Colar imagem',
}: {
  onImage: (file: File) => void
  label?: string
}) {
  const toast = useToast()

  async function handleClick() {
    if (!navigator.clipboard?.read) {
      toast.error('Seu navegador não permite colar imagem direto pelo botão — use Ctrl+V no campo.')
      return
    }
    try {
      const items = await navigator.clipboard.read()
      for (const item of items) {
        const imageType = item.types.find((t) => t.startsWith('image/'))
        if (!imageType) continue
        const blob = await item.getType(imageType)
        const ext = imageType.split('/')[1] || 'png'
        onImage(new File([blob], `clipboard-${Date.now()}.${ext}`, { type: imageType }))
        return
      }
      toast.error('Nenhuma imagem encontrada na área de transferência.')
    } catch {
      toast.error('Não deu para acessar a área de transferência — seu navegador pode ter bloqueado a permissão.')
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      title="Colar imagem da área de transferência, se houver"
      className="text-label inline-flex cursor-pointer items-center gap-1.5 border-2 border-line px-2.5 py-1.5 text-[11px] text-canvas-fg/70 hover:bg-accent-blue hover:text-ink"
    >
      <ClipboardPaste size={12} />
      {label}
    </button>
  )
}
