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
import type { InboxProperty } from '../../hooks/useConversationInbox'
import ConversationHeader from './ConversationHeader'
import ContactUnlockBanner from './ContactUnlockBanner'
import ContactUnlockActions from './ContactUnlockActions'
import MessageBubble from './MessageBubble'
import SystemEventLine from './SystemEventLine'
import MessageComposer from './MessageComposer'

type DisplayMessage = ConversationMessageRow & {
  displayBody: string
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
  const [landlordContact, setLandlordContact] = useState<ContactDetails | null>(null)
  const [tenantContact, setTenantContact] = useState<ContactDetails | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const contactUnlocked = conversation.contact_unlocked_at != null

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
        })),
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load messages')
    } finally {
      setLoading(false)
    }
  }, [conversation.id, contactUnlocked, maskingEnabled])

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
  }, [messages.length])

  const onRealtimeInsert = useCallback(
    (row: ConversationMessageRow) => {
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
                }
              : m,
          )
        }

        return [
          ...prev,
          {
            ...row,
            displayBody: mapDisplay(row, contactUnlocked, maskingEnabled),
          },
        ]
      })
      void markConversationRead(conversation.id).catch(() => {})
    },
    [contactUnlocked, conversation.id, maskingEnabled],
  )

  useConversationRealtime(conversation.id, onRealtimeInsert)

  useEffect(() => {
    if (!contactUnlocked) return
    async function loadContacts() {
      const [{ data: lp }, { data: sp }] = await Promise.all([
        supabase
          .from('landlord_profiles')
          .select('full_name, email, phone')
          .eq('id', conversation.landlord_profile_id)
          .maybeSingle(),
        conversation.tenant_profile_id
          ? supabase
              .from('student_profiles')
              .select('full_name, email, phone')
              .eq('id', conversation.tenant_profile_id)
              .maybeSingle()
          : supabase
              .from('student_profiles')
              .select('full_name, email, phone')
              .eq('user_id', conversation.tenant_user_id)
              .maybeSingle(),
      ])
      setLandlordContact(
        lp
          ? { fullName: lp.full_name, email: lp.email, phone: lp.phone }
          : null,
      )
      setTenantContact(
        sp
          ? { fullName: sp.full_name, email: sp.email, phone: sp.phone }
          : null,
      )
    }
    void loadContacts()
  }, [contactUnlocked, conversation])

  async function handleSend(body: string) {
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

      <ConversationHeader property={conversation.property} contactUnlocked={contactUnlocked} />

      <div className="px-4 py-3 space-y-3 bg-gray-50 border-b border-gray-100">
        {!contactUnlocked && <ContactUnlockBanner />}
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
            className="block text-center rounded-xl bg-[#FF6F61] text-white py-2.5 text-sm font-semibold hover:opacity-95"
          >
            Request to book
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
        {!loading &&
          messages.map((m) =>
            m.kind === 'system' ? (
              <SystemEventLine key={m.id} message={m} />
            ) : (
              <MessageBubble
                key={m.id}
                message={m}
                displayBody={m.displayBody}
                isOwn={m.sender_user_id === currentUserId}
              />
            ),
          )}
        <div ref={bottomRef} />
      </div>

      <MessageComposer onSend={handleSend} />
    </div>
  )
}
