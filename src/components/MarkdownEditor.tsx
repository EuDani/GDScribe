import { useRef, useState } from 'react'
import { Image as ImageIcon } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { clsx } from 'clsx'
import { Textarea } from '@/components/ui/Input'
import { useUploadImage } from '@/lib/useUploadImage'

export function MarkdownEditor({
  projectId,
  value,
  onChange,
  rows = 14,
  placeholder,
}: {
  projectId: string
  value: string
  onChange: (value: string) => void
  rows?: number
  placeholder?: string
}) {
  const [view, setView] = useState<'edit' | 'preview'>('edit')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { upload, uploading } = useUploadImage(projectId)

  function insertAtCursor(snippet: string) {
    const el = textareaRef.current
    if (!el) {
      onChange(`${value}\n${snippet}\n`)
      return
    }
    const start = el.selectionStart ?? value.length
    const end = el.selectionEnd ?? value.length
    const next = `${value.slice(0, start)}${snippet}${value.slice(end)}`
    onChange(next)
    requestAnimationFrame(() => {
      el.focus()
      const cursor = start + snippet.length
      el.setSelectionRange(cursor, cursor)
    })
  }

  async function handleFile(file: File) {
    const url = await upload(file, 'content-images')
    if (url) insertAtCursor(`\n![](${url})\n`)
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setView('edit')}
            className={clsx(
              'text-label border-2 border-line px-2.5 py-1 text-[11px]',
              view === 'edit' ? 'bg-accent-yellow text-ink' : 'text-canvas-fg/60',
            )}
          >
            Editar
          </button>
          <button
            type="button"
            onClick={() => setView('preview')}
            className={clsx(
              'text-label border-2 border-line px-2.5 py-1 text-[11px]',
              view === 'preview' ? 'bg-accent-yellow text-ink' : 'text-canvas-fg/60',
            )}
          >
            Preview
          </button>
        </div>
        {view === 'edit' && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFile(file)
                e.target.value = ''
              }}
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="text-label flex items-center gap-1.5 border-2 border-line px-2.5 py-1 text-[11px] text-canvas-fg/70 hover:bg-accent-blue hover:text-ink disabled:opacity-50"
            >
              <ImageIcon size={12} />
              {uploading ? 'Enviando…' : 'Inserir imagem'}
            </button>
          </>
        )}
      </div>

      {view === 'edit' ? (
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          className="font-mono text-xs"
          placeholder={placeholder}
        />
      ) : (
        <div className="prose prose-invert max-w-none border-2 border-line/40 bg-paper/5 p-3 text-sm">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{value || '*Nada escrito ainda.*'}</ReactMarkdown>
        </div>
      )}
    </div>
  )
}
