import { useEffect, useRef } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import {
  Bold,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Redo,
  Strikethrough,
  Undo,
} from 'lucide-react'
import { clsx } from 'clsx'
import { useUploadImage } from '@/lib/useUploadImage'

function ToolbarButton({
  active,
  disabled,
  onClick,
  label,
  children,
}: {
  active?: boolean
  disabled?: boolean
  onClick: () => void
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={clsx(
        'cursor-pointer border-2 border-line p-1.5 text-canvas-fg/70 disabled:cursor-not-allowed disabled:opacity-30',
        active ? 'bg-accent-yellow text-ink' : 'hover:bg-accent-blue hover:text-ink',
      )}
    >
      {children}
    </button>
  )
}

export function RichTextEditor({
  projectId,
  value,
  onChange,
  placeholder,
  minHeight = 220,
}: {
  projectId: string
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: number
}) {
  const { uploadMany, uploading } = useUploadImage(projectId)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ HTMLAttributes: { class: 'border-2 border-line' } }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'underline text-accent-blue' } }),
      Placeholder.configure({ placeholder: placeholder ?? 'Escreva…' }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  })

  // sincroniza quando o valor muda por fora (ex: trocou de módulo selecionado)
  const lastExternalValue = useRef(value)
  useEffect(() => {
    if (!editor) return
    if (value !== lastExternalValue.current && value !== editor.getHTML()) {
      editor.commands.setContent(value)
    }
    lastExternalValue.current = value
  }, [value, editor])

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0 || !editor) return
    const urls = await uploadMany(Array.from(files), 'content-images')
    for (const url of urls) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }

  function toggleLink() {
    if (!editor) return
    const previous = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('URL do link', previous ?? 'https://')
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  if (!editor) return null

  return (
    <div className="border-2 border-line/40">
      <div className="flex flex-wrap items-center gap-1 border-b-2 border-line/40 bg-canvas/40 p-1.5">
        <ToolbarButton label="Negrito" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold size={13} />
        </ToolbarButton>
        <ToolbarButton label="Itálico" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic size={13} />
        </ToolbarButton>
        <ToolbarButton
          label="Riscado"
          active={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough size={13} />
        </ToolbarButton>
        <ToolbarButton
          label="Título 2"
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 size={13} />
        </ToolbarButton>
        <ToolbarButton
          label="Título 3"
          active={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 size={13} />
        </ToolbarButton>
        <ToolbarButton
          label="Lista"
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List size={13} />
        </ToolbarButton>
        <ToolbarButton
          label="Lista numerada"
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered size={13} />
        </ToolbarButton>
        <ToolbarButton
          label="Citação"
          active={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote size={13} />
        </ToolbarButton>
        <ToolbarButton label="Link" active={editor.isActive('link')} onClick={toggleLink}>
          <LinkIcon size={13} />
        </ToolbarButton>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files)
            e.target.value = ''
          }}
        />
        <ToolbarButton
          label={uploading ? 'Enviando…' : 'Inserir imagens'}
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          <ImageIcon size={13} />
        </ToolbarButton>
        <div className="mx-1 h-4 w-px bg-line/40" />
        <ToolbarButton label="Desfazer" onClick={() => editor.chain().focus().undo().run()}>
          <Undo size={13} />
        </ToolbarButton>
        <ToolbarButton label="Refazer" onClick={() => editor.chain().focus().redo().run()}>
          <Redo size={13} />
        </ToolbarButton>
      </div>
      <EditorContent
        editor={editor}
        className="prose prose-invert max-w-none px-3 py-2 text-sm [&_.ProseMirror]:outline-none"
        style={{ minHeight }}
      />
    </div>
  )
}
