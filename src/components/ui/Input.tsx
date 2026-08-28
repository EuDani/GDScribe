import { clsx } from 'clsx'
import type {
  InputHTMLAttributes,
  ReactNode,
  Ref,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'

const FIELD_CLASSES =
  'w-full border-2 border-ink bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-accent-yellow'

export function Field({
  label,
  error,
  children,
  hint,
}: {
  label?: string
  error?: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="mb-4 block last:mb-0">
      {label && <span className="text-label mb-1.5 block text-xs text-paper/70">{label}</span>}
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-paper/50">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-accent-red">{error}</span>}
    </label>
  )
}

export function TextInput({
  className,
  ref,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { ref?: Ref<HTMLInputElement> }) {
  return <input ref={ref} className={clsx(FIELD_CLASSES, className)} {...props} />
}

export function Textarea({
  className,
  ref,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { ref?: Ref<HTMLTextAreaElement> }) {
  return <textarea ref={ref} className={clsx(FIELD_CLASSES, 'resize-y', className)} {...props} />
}

export function Select({
  className,
  ref,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { ref?: Ref<HTMLSelectElement> }) {
  return (
    <select ref={ref} className={clsx(FIELD_CLASSES, 'cursor-pointer', className)} {...props}>
      {children}
    </select>
  )
}
