import type { LucideIcon } from 'lucide-react'
import {
  Armchair,
  Backpack,
  Briefcase,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  GraduationCap,
  Lock,
  MessageSquare,
  Pencil,
  Phone,
  Plane,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  User,
} from 'lucide-react'
import type { RenterSituation } from '../../../lib/renterSituation'

export type ProfileSectionIconKind =
  | 'user'
  | 'verify'
  | 'work'
  | 'study'
  | 'emergency'
  | 'prefs'
  | 'bio'
  | 'guarantor'
  | 'situation'

const ICONS: Record<ProfileSectionIconKind, LucideIcon> = {
  user: User,
  verify: CheckCircle2,
  work: Briefcase,
  study: GraduationCap,
  emergency: Phone,
  prefs: SlidersHorizontal,
  bio: MessageSquare,
  guarantor: ShieldCheck,
  situation: Compass,
}

export function ProfileSectionIcon({
  kind,
  size = 20,
  className,
}: {
  kind: ProfileSectionIconKind
  size?: number
  className?: string
}) {
  const Icon = ICONS[kind]
  return <Icon size={size} className={className} aria-hidden />
}

export const SITUATION_TILE_ICONS: Record<
  RenterSituation,
  LucideIcon
> = {
  student: GraduationCap,
  working: Briefcase,
  working_holiday: Plane,
  backpacker: Backpack,
  retired: Armchair,
  between_jobs: Clock,
}

export {
  Check,
  ChevronDown,
  ChevronUp,
  Lock,
  Pencil,
  RefreshCw,
}
