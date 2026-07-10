import type { ConversationMessageRow } from './conversationTypes.js'
import {
  landlordDisplayName,
  studentDisplayName,
  type NameProfile,
} from '../nameResolution.js'

export type ParticipantDisplayNames = {
  tenant: string
  landlord: string
}

export const STUDENT_DISPLAY_NAME_SELECT =
  'preferred_name, full_name, first_name, last_name' as const

export const LANDLORD_DISPLAY_NAME_SELECT =
  'full_name, first_name, last_name, company_name' as const

export function resolveParticipantDisplayNames(
  landlordProfile: NameProfile | null | undefined,
  studentProfile: NameProfile | null | undefined,
): ParticipantDisplayNames {
  return {
    tenant: studentDisplayName(studentProfile ?? {}, 'Tenant'),
    landlord: landlordDisplayName(landlordProfile ?? {}, 'Landlord'),
  }
}

export function resolveCounterpartyDisplayName(
  viewerUserId: string,
  conversation: { landlord_user_id: string; tenant_user_id: string },
  landlordProfile: NameProfile | null | undefined,
  studentProfile: NameProfile | null | undefined,
): string {
  const isLandlordViewer = conversation.landlord_user_id === viewerUserId
  if (isLandlordViewer) {
    return studentDisplayName(studentProfile ?? {}, 'Student')
  }
  return landlordDisplayName(landlordProfile ?? {}, 'Landlord')
}

export function senderDisplayNameForMessage(
  senderRole: ConversationMessageRow['sender_role'],
  names: ParticipantDisplayNames,
): string | null {
  if (senderRole === 'tenant') return names.tenant
  if (senderRole === 'landlord') return names.landlord
  return null
}

/** Up to two initials from a display name (no image fetch). */
export function initialsFromDisplayName(displayName: string): string {
  const words = displayName.trim().split(/\s+/).filter(Boolean)
  if (!words.length) return '?'
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase()
  return `${words[0]![0] ?? ''}${words[1]![0] ?? ''}`.toUpperCase()
}

const AVATAR_PALETTE = [
  'bg-indigo-100 text-indigo-800',
  'bg-emerald-100 text-emerald-800',
  'bg-amber-100 text-amber-900',
  'bg-sky-100 text-sky-800',
  'bg-rose-100 text-rose-800',
  'bg-violet-100 text-violet-800',
] as const

export function avatarColorClassForName(displayName: string): string {
  let hash = 0
  for (let i = 0; i < displayName.length; i++) {
    hash = (hash + displayName.charCodeAt(i)) % 9973
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length]!
}
