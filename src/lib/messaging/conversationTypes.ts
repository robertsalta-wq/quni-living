import type { Database } from '../database.types.js'

export type ConversationRow = Database['public']['Tables']['conversations']['Row']
export type ConversationInsert = Database['public']['Tables']['conversations']['Insert']
export type ConversationUpdate = Database['public']['Tables']['conversations']['Update']

export type ConversationMessageRow = Database['public']['Tables']['conversation_messages']['Row']
export type ConversationMessageInsert = Database['public']['Tables']['conversation_messages']['Insert']

export type MessageContactMaskEventRow =
  Database['public']['Tables']['message_contact_mask_events']['Row']

export type ConversationStatus = ConversationRow['status']
export type MessageSenderRole = ConversationMessageRow['sender_role']
export type MessageKind = ConversationMessageRow['kind']
export type MaskType = MessageContactMaskEventRow['mask_type']

export const CONVERSATION_STATUSES = ['open', 'archived'] as const satisfies readonly ConversationStatus[]

export const MESSAGE_SENDER_ROLES = ['tenant', 'landlord', 'system'] as const satisfies readonly MessageSenderRole[]

export const MESSAGE_KINDS = ['user', 'system'] as const satisfies readonly MessageKind[]

export const MASK_TYPES = ['phone', 'email', 'url', 'social'] as const satisfies readonly MaskType[]
