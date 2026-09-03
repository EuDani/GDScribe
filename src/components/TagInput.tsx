import { useMemo, useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { accentFromString } from '@/components/ui/Badge'

const ACCENT_BG: Record<string, string> = {
  red: 'bg-accent-red',
  yellow: 'bg-accent-yellow',
  blue: 'bg-accent-blue',
  green: 'bg-accent-green',
  purple: 'bg-accent-purple',
}

export function TagInput({
  value,
  onChange,
  suggestions = [],
  placeholder = 'Adicionar tag…',
}: {
  value: string[]
  onChange: (tags: string[]) => void
  suggestions?: string[]
  placeholder?: string
}) {
  const [inputValue, setInputValue] = useState('')
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const filteredSuggestions = useMemo(() => {
    const query = inputValue.trim().toLowerCase()
    return suggestions.filter((s) => !value.includes(s) && (query === '' || s.toLowerCase().includes(query)))
  }, [suggestions, value, inputValue])

  const canAddNew = inputValue.trim() !== '' && !value.includes(inputValue.trim()) && !suggestions.includes(inputValue.trim())

  function addTag(tag: string) {
    const clean = tag.trim()
    if (!clean || value.includes(clean)) return
    onChange([...value, clean])
    setInputValue('')
    inputRef.current?.focus()
  }

  function removeTag(tag: string) {
    onChange(value.filter((t) => t !== tag))
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      if (inputValue.trim()) addTag(inputValue)
    } else if (e.key === 'Backspace' && inputValue === '' && value.length > 0) {
      removeTag(value[value.length - 1])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="relative">
      <div
        className="flex w-full flex-wrap items-center gap-1.5 border-2 border-line bg-paper px-2 py-1.5 text-ink focus-within:ring-2 focus-within:ring-accent-yellow"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag) => {
          const accent = accentFromString(tag)
          return (
            <span
              key={tag}
              className={`text-label inline-flex items-center gap-1 border-2 border-ink px-1.5 py-0.5 text-[10px] font-semibold text-ink ${ACCENT_BG[accent]}`}
            >
              {tag}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  removeTag(tag)
                }}
                aria-label={`Remover tag ${tag}`}
                className="cursor-pointer hover:opacity-60"
              >
                <X size={10} />
              </button>
            </span>
          )
        })}
        <input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            blurTimeout.current = setTimeout(() => setOpen(false), 120)
          }}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ''}
          className="min-w-[80px] flex-1 bg-transparent text-sm outline-none placeholder:text-ink/40"
        />
      </div>

      {open && (filteredSuggestions.length > 0 || canAddNew) && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-40 overflow-y-auto border-2 border-line bg-paper shadow-brutal-sm">
          {filteredSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => addTag(s)}
              className="flex w-full cursor-pointer items-center gap-2 px-2.5 py-1.5 text-left text-xs text-ink hover:bg-accent-yellow"
            >
              {s}
            </button>
          ))}
          {canAddNew && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => addTag(inputValue)}
              className="flex w-full cursor-pointer items-center gap-1.5 border-t border-ink/10 px-2.5 py-1.5 text-left text-xs text-ink hover:bg-accent-yellow"
            >
              <Plus size={11} /> Criar tag "{inputValue.trim()}"
            </button>
          )}
        </div>
      )}
    </div>
  )
}
