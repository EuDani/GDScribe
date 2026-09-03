import {
  AlertTriangle,
  Bell,
  Bug,
  CheckCircle2,
  Clock,
  Code2,
  Flag,
  type LucideIcon,
  Music,
  Palette,
  Rocket,
  Shield,
  Sparkles,
  Star,
  Swords,
  Target,
  Zap,
} from 'lucide-react'

export const ICON_MAP: Record<string, LucideIcon> = {
  Bug,
  Star,
  Flag,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Rocket,
  Swords,
  Shield,
  Music,
  Palette,
  Code2,
  Bell,
  Clock,
  Target,
  Sparkles,
}

export const ICON_NAMES = Object.keys(ICON_MAP)

export function CardIcon({ name, size = 14 }: { name: string; size?: number }) {
  const Icon = ICON_MAP[name]
  if (!Icon) return null
  return <Icon size={size} />
}
