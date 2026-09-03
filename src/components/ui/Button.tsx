import { motion } from 'motion/react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { clsx } from 'clsx'

type Variant = 'primary' | 'accent' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

type ConflictingProps =
  | 'className'
  | 'onDrag'
  | 'onDragStart'
  | 'onDragEnd'
  | 'onAnimationStart'
  | 'onAnimationEnd'
  | 'onAnimationIteration'

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, ConflictingProps> {
  variant?: Variant
  size?: Size
  icon?: ReactNode
  className?: string
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-paper text-ink hover:bg-accent-yellow',
  accent: 'bg-accent-yellow text-ink hover:bg-paper',
  ghost: 'bg-transparent text-canvas-fg hover:bg-surface',
  danger: 'bg-accent-red text-canvas-fg hover:bg-paper hover:text-accent-red',
}

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2.5 text-sm gap-2',
  lg: 'px-6 py-3.5 text-base gap-2.5',
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <motion.button
      type={props.type ?? 'button'}
      whileHover={disabled ? undefined : { x: -2, y: -2 }}
      whileTap={disabled ? undefined : { x: 0, y: 0 }}
      className={clsx(
        'text-label inline-flex cursor-pointer items-center justify-center border-2 border-line font-semibold shadow-brutal-sm transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      disabled={disabled}
      {...props}
    >
      {icon}
      {children}
    </motion.button>
  )
}
