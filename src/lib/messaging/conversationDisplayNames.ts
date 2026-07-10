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
