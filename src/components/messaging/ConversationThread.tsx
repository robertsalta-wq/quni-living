import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { ConversationMessageRow, ConversationRow } from '../../lib/messaging/conversationTypes'
import { displayMessageBody } from '../../lib/messaging/displayMessageBody'
import {
  markConversationRead,
  sendConversationMessage,
} from '../../lib/messaging/conversationsApi'
import { useConversationRealtime } from '../../hooks/useConversationRealtime'
import { useConversationPresence } from '../../hooks/useConversationPresence'
import { useConversationTyping } from '../../hooks/useConversationTyping'
import {
  useConversationRowRealtime,
  type ConversationLiveFields,
} from '../../hooks/useConversationRowRealtime'
import type { InboxProperty } from '../../hooks/useConversationInbox'
import ConversationHeader from './ConversationHeader'
import ContactUnlockBanner from './ContactUnlockBanner'
import ContactUnlockActions from './ContactUnlockActions'
import MessageBubble from './MessageBubble'
import SystemEventLine from './SystemEventLine'
import MessageComposer from './MessageComposer'
import TypingIndicator from './TypingIndicator'
import { landlordDisplayName, studentDisplayName } from '../../lib/nameResolution'
import {
  LANDLORD_DISPLAY_NAME_SELECT,
  STUDENT_DISPLAY_NAME_SELECT,
  resolveParticipantDisplayNames,
  senderDisplayNameForMessage,
  type ParticipantDisplayNames,
} from '../../lib/messaging/conversationDisplayNames'

type DisplayMessage = ConversationMessageRow & {
  displayBody: string
  senderDisplayName: string | null
  pending?: boolean
  failed?: boolean
}

type ContactDetails = {
  fullName: string | null
  email: string | null
  phone: string | null
}

type Props = {
  conversation: ConversationRow & { property: InboxProperty | null }
  currentUserId: string
  viewerRole: 'tenant' | 'landlord'
}

function mapDisplay(
  row: ConversationMessageRow,
  contactUnlocked: boolean,
  maskingEnabled: boolean,
): string {
  if (row.kind === 'system') return row.body
  return displayMessageBody(row.body, { contactUnlocked, maskingEnabled })
}

export default function ConversationThread({ conversation, currentUserId, viewerRole }: Props) {
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [maskingEnabled, setMaskingEnabled] = useState(true)
  const [participantDisplayNames, setParticipantDisplayNames] =
    useState<ParticipantDisplayNames | null>(null)
  const [landlordContact, setLandlordContact] = useState<ContactDetails | null>(null)
  const [tenantContact, setTenantContact] = useState<ContactDetails | null>(null)
  const [conversationLive, setConversationLive] = useState<ConversationLiveFields>(() => ({
    landlord_last_read_at: conversation.landlord_last_read_at,
    tenant_last_read_at: conversation.tenant_last_read_at,
    contact_unlocked_at: conversation.contact_unlocked_at,
  }))
  const bottomRef = useRef<HTMLDivElement>(null)

  const contactUnlocked = conversationLive.contact_unlocked_at != null

  const counterpartyUserId = useMemo(() => {
    if (currentUserId === conversation.landlord_user_id) return conversation.tenant_user_id
    if (currentUserId === conversation.tenant_user_id) return conversation.landlord_user_id
    return undefined
  }, [conversation.landlord_user_id, conversation.tenant_user_id, currentUserId])

  useEffect(() => {
    setConversationLive({
      landlord_last_read_at: conversation.landlord_last_read_at,
      tenant_last_read_at: conversation.tenant_last_read_at,
      contact_unlocked_at: conversation.contact_unlocked_at,
    })
  }, [
    conversation.id,
    conversation.landlord_last_read_at,
    conversation.tenant_last_read_at,
    conversation.contact_unlocked_at,
  ])

  const onConversationLiveUpdate = useCallback((fields: ConversationLiveFields) => {
    setConversationLive(fields)
  }, [])

  useConversationRowRealtime(conversation.id, onConversationLiveUpdate)

  const counterpartyOnline = useConversationPresence(
    conversation.id,
    currentUserId,
    counterpartyUserId,
  )

  const {
    counterpartyTyping,
    notifyTyping,
    stopTyping,
    dismissCounterpartyTyping,
  } = useConversationTyping(conversation.id, currentUserId)

  const loadMessages = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: qErr } = await supabase
        .from('conversation_messages')
        .select('*')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true })

      if (qErr) throw qErr
      setMessages(
        (data ?? []).map((row) => ({
          ...row,
          displayBody: mapDisplay(row, contactUnlocked, maskingEnabled),
          senderDisplayName: participantDisplayNames
            ? senderDisplayNameForMessage(row.sender_role, participantDisplayNames)
            : null,
        })),
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load messages')
    } finally {
      setLoading(false)
    }
  }, [conversation.id, contactUnlocked, maskingEnabled, participantDisplayNames])

  useEffect(() => {
    void loadMessages()
  }, [loadMessages])

  useEffect(() => {
    void markConversationRead(conversation.id).catch(() => {
      /* non-blocking */
    })
  }, [conversation.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, counterpartyTyping])

  const lastOwnMessageId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i]!
      if (m.kind === 'user' && m.sender_user_id === currentUserId && !m.pending && !m.failed) {
        return m.id
      }
    }
    return null
  }, [messages, currentUserId])

  const counterpartyLastReadAt =
    viewerRole === 'landlord'
      ? conversationLive.tenant_last_read_at
      : conversationLive.landlord_last_read_at

  const showReadOnLastOwn = useMemo(() => {
    if (!lastOwnMessageId || !counterpartyLastReadAt) return false
    const lastOwn = messages.find((m) => m.id === lastOwnMessageId)
    if (!lastOwn) return false
    return new Date(counterpartyLastReadAt).getTime() >= new Date(lastOwn.created_at).getTime()
  }, [lastOwnMessageId, counterpartyLastReadAt, messages])

  const onRealtimeInsert = useCallback(
    (row: ConversationMessageRow) => {
      if (row.sender_user_id === counterpartyUserId) {
        dismissCounterpartyTyping()
      }
      setMessages((prev) => {
        if (prev.some((m) => m.id === row.id)) return prev

        // Realtime often beats the send API response; merge into the pending bubble
        // instead of appending a second copy with the real id.
        const pendingIdx = prev.findIndex(
          (m) =>
            m.pending &&
            m.sender_user_id === row.sender_user_id &&
            m.body.trim() === row.body.trim(),
        )
        if (pendingIdx >= 0) {
          return prev.map((m, i) =>
            i === pendingIdx
              ? {
                  ...row,
                  displayBody: mapDisplay(row, contactUnlocked, maskingEnabled),
                  senderDisplayName: participantDisplayNames
                    ? senderDisplayNameForMessage(row.sender_role, participantDisplayNames)
                    : null,
                }
              : m,
          )
        }

        return [
          ...prev,
          {
            ...row,
            displayBody: mapDisplay(row, contactUnlocked, maskingEnabled),
            senderDisplayName: participantDisplayNames
              ? senderDisplayNameForMessage(row.sender_role, participantDisplayNames)
              : null,
          },
        ]
      })
      void markConversationRead(conversation.id).catch(() => {})
    },
    [contactUnlocked, conversation.id, counterpartyUserId, dismissCounterpartyTyping, maskingEnabled, participantDisplayNames],
  )

  useConversationRealtime(conversation.id, onRealtimeInsert)

  useEffect(() => {
    async function loadParticipants() {
      const [{ data: lp }, { data: sp }] = await Promise.all([
        supabase
          .from('landlord_profiles')
          .select(`${LANDLORD_DISPLAY_NAME_SELECT}, email, phone`)
          .eq('id', conversation.landlord_profile_id)
          .maybeSingle(),
        conversation.tenant_profile_id
          ? supabase
              .from('student_profiles')
              .select(`${STUDENT_DISPLAY_NAME_SELECT}, email, phone`)
              .eq('id', conversation.tenant_profile_id)
              .maybeSingle()
          : supabase
              .from('student_profiles')
              .select(`${STUDENT_DISPLAY_NAME_SELECT}, email, phone`)
              .eq('user_id', conversation.tenant_user_id)
              .maybeSingle(),
      ])

      setParticipantDisplayNames(resolveParticipantDisplayNames(lp, sp))

      if (contactUnlocked) {
        setLandlordContact(
          lp
            ? { fullName: landlordDisplayName(lp), email: lp.email, phone: lp.phone }
            : null,
        )
        setTenantContact(
          sp
            ? { fullName: studentDisplayName(sp), email: sp.email, phone: sp.phone }
            : null,
        )
      } else {
        setLandlordContact(null)
        setTenantContact(null)
      }
    }
    void loadParticipants()
  }, [contactUnlocked, conversation])

  async function handleSend(body: string) {
    stopTyping()
    const tempId = `pending-${Date.now()}`
    const optimistic: DisplayMessage = {
      id: tempId,
      conversation_id: conversation.id,
      sender_user_id: currentUserId,
      sender_role: viewerRole,
      kind: 'user',
      body,
      metadata: {},
      created_at: new Date().toISOString(),
      displayBody: mapDisplay(
        {
          id: tempId,
          conversation_id: conversation.id,
          sender_user_id: currentUserId,
          sender_role: viewerRole,
          kind: 'user',
          body,
          metadata: {},
          created_at: new Date().toISOString(),
        },
        contactUnlocked,
        maskingEnabled,
      ),
      senderDisplayName: participantDisplayNames
        ? senderDisplayNameForMessage(viewerRole, participantDisplayNames)
        : null,
      pending: true,
    }
    setMessages((prev) => [...prev, optimistic])

    try {
      const result = await sendConversationMessage(conversation.id, body)
      setMaskingEnabled(result.maskingEnabled)
      setMessages((prev) => {
        if (prev.some((m) => m.id === result.messageId)) {
          return prev.filter((m) => m.id !== tempId)
        }
        return prev.map((m) =>
          m.id === tempId
            ? {
                id: result.messageId,
                conversation_id: conversation.id,
                sender_user_id: currentUserId,
                sender_role: viewerRole,
                kind: 'user',
                body,
                metadata: {},
                created_at: result.createdAt,
                displayBody: result.displayBody,
                senderDisplayName: participantDisplayNames
                  ? senderDisplayNameForMessage(viewerRole, participantDisplayNames)
                  : null,
              }
            : m,
        )
      })
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, pending: false, failed: true } : m)),
      )
      throw err
    }
  }

  const bookHref = useMemo(() => {
    const pid = conversation.property?.id ?? conversation.property_id
    return pid ? `/booking/${pid}?conversationId=${conversation.id}` : null
  }, [conversation])

  return (
    <div className="flex flex-col min-h-[calc(100dvh-4rem)] md:min-h-[70vh] max-w-3xl mx-auto w-full bg-gray-50 border-x border-gray-100">
      <div className="flex items-center gap-2 px-3 py-2 bg-white border-b border-gray-100 md:hidden">
        <Link to="/messages" className="text-sm font-medium text-gray-600 hover:text-gray-900">
          ← Messages
        </Link>
      </div>

      <ConversationHeader
        property={conversation.property}
        contactUnlocked={contactUnlocked}
        counterpartyOnline={counterpartyOnline}
      />

      <div className="px-4 py-3 space-y-3 bg-gray-50 border-b border-gray-100">
        {contactUnlocked && (
          <ContactUnlockActions
            landlord={landlordContact}
            tenant={tenantContact}
            viewerRole={viewerRole}
          />
        )}
        {viewerRole === 'tenant' && bookHref && (
          <Link
            to={bookHref}
            className="block text-center rounded-xl bg-[var(--quni-coral)] text-white py-2.5 text-sm font-semibold hover:opacity-95"
          >
            Apply
          </Link>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
        {loading && <p className="text-sm text-gray-500 text-center py-8">Loading messages…</p>}
        {error && (
          <p className="text-sm text-red-700 text-center py-4" role="alert">
            {error}
          </p>
        )}
        {!loading && !contactUnlocked && <ContactUnlockBanner />}
        {!loading &&
          messages.map((m, index) => {
            if (m.kind === 'system') {
              return <SystemEventLine key={m.id} message={m} />
            }

            const isOwn = m.sender_user_id === currentUserId
            const prev = index > 0 ? messages[index - 1] : null
            const showSenderIdentity =
              !isOwn &&
              (prev == null ||
                prev.kind === 'system' ||
                prev.sender_user_id !== m.sender_user_id)

            return (
              <MessageBubble
                key={m.id}
                message={m}
                displayBody={m.displayBody}
                isOwn={isOwn}
                senderDisplayName={m.senderDisplayName}
                showSenderIdentity={showSenderIdentity}
                showReadReceipt={isOwn && showReadOnLastOwn && m.id === lastOwnMessageId}
              />
            )
          })}
        {!loading && counterpartyTyping ? <TypingIndicator /> : null}
        <div ref={bottomRef} />
      </div>

      <MessageComposer
        onSend={handleSend}
        onTypingActivity={notifyTyping}
        onTypingStop={stopTyping}
      />
    </div>
  )
}
