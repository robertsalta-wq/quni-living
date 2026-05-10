import {
  AlertTriangle,
  AppWindow,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Bookmark,
  BookOpen,
  Building2,
  CalendarCheck,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  CreditCard,
  DollarSign,
  FileText,
  Filter,
  Globe,
  GraduationCap,
  Home,
  Inbox,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Package,
  Plus,
  RotateCw,
  Search,
  Settings,
  ShieldCheck,
  Sliders,
  Tags,
  TrendingUp,
  UserPlus,
  Users,
  Workflow,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/**
 * Admin icon set — single source of truth.
 *
 * Thin wrapper around lucide-react that locks the surface to a small,
 * named subset. Per `docs/admin-redesign/HANDOFF.md` §2/§7:
 * - Outline, 1.75 stroke, no inline SVGs.
 * - Admin pages never reach for emoji.
 * - Add new icons by extending this map only.
 */
const ICONS = {
  'alert-triangle': AlertTriangle,
  'app-window': AppWindow,
  'arrow-right': ArrowRight,
  'arrow-up-right': ArrowUpRight,
  bell: Bell,
  bookmark: Bookmark,
  'book-open': BookOpen,
  'building-2': Building2,
  'calendar-check': CalendarCheck,
  check: Check,
  'check-circle': CheckCircle,
  'chevron-down': ChevronDown,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  circle: Circle,
  'credit-card': CreditCard,
  'dollar-sign': DollarSign,
  'file-text': FileText,
  filter: Filter,
  globe: Globe,
  'graduation-cap': GraduationCap,
  home: Home,
  inbox: Inbox,
  'layout-dashboard': LayoutDashboard,
  'life-buoy': LifeBuoy,
  'log-out': LogOut,
  mail: Mail,
  'message-square': MessageSquare,
  'more-horizontal': MoreHorizontal,
  package: Package,
  plus: Plus,
  'rotate-cw': RotateCw,
  search: Search,
  settings: Settings,
  'shield-check': ShieldCheck,
  sliders: Sliders,
  tags: Tags,
  'trending-up': TrendingUp,
  'user-plus': UserPlus,
  users: Users,
  workflow: Workflow,
} as const satisfies Record<string, LucideIcon>

export type IconName = keyof typeof ICONS

export interface IconProps {
  name: IconName
  size?: number
  className?: string
  strokeWidth?: number
}

export function Icon({ name, size = 16, className, strokeWidth = 1.75 }: IconProps) {
  const Cmp = ICONS[name]
  return <Cmp size={size} strokeWidth={strokeWidth} className={className} aria-hidden />
}
