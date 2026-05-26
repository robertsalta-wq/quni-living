/**
 * Link bookings to peer conversations, system messages, and contact unlock on confirm.
 */

const SYSTEM_COPY = {
  booking_requested: 'A booking request was submitted for this listing.',
  contact_unlocked: 'Contact details are now unlocked. You can share phone and email in this thread.',
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {{ conversation_id?: string | null; property_id?: string | null; student_id?: string | null }} booking
 */
export async function resolveConversationForBooking(admin, booking) {
  if (booking.conversation_id) {
    const { data, error } = await admin
      .from('conversations')
      .select('*')
      .eq('id', booking.conversation_id)
      .maybeSingle()
    if (error) {
      console.warn('[bookingConversation] load by conversation_id', error.message)
      return null
    }
    return data
  }

  if (!booking.property_id || !booking.student_id) return null

  const { data: student, error: stErr } = await admin
    .from('student_profiles')
    .select('user_id')
    .eq('id', booking.student_id)
    .maybeSingle()

  if (stErr || !student?.user_id) return null

  const { data: conv, error: convErr } = await admin
    .from('conversations')
    .select('*')
    .eq('property_id', booking.property_id)
    .eq('tenant_user_id', student.user_id)
    .maybeSingle()

  if (convErr) {
    console.warn('[bookingConversation] lookup by property+tenant', convErr.message)
    return null
  }
  return conv
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} conversationId
 * @param {{ event: string; bookingId: string; senderUserId?: string | null }} opts
 */
async function insertSystemMessage(admin, conversationId, opts) {
  const nowIso = new Date().toISOString()
  const body = SYSTEM_COPY[opts.event] || 'Booking update'
  const preview = body.length > 120 ? `${body.slice(0, 117)}…` : body

  const { data: inserted, error: insErr } = await admin
    .from('conversation_messages')
    .insert({
      conversation_id: conversationId,
      sender_user_id: opts.senderUserId ?? null,
      sender_role: 'system',
      kind: 'system',
      body,
      metadata: { event: opts.event, bookingId: opts.bookingId },
    })
    .select('id')
    .single()

  if (insErr) {
    console.error('[bookingConversation] system message insert', insErr)
    return null
  }

  const { error: convErr } = await admin
    .from('conversations')
    .update({
      last_message_at: nowIso,
      last_message_preview: preview,
    })
    .eq('id', conversationId)

  if (convErr) {
    console.error('[bookingConversation] conversation preview update', convErr)
  }

  return inserted?.id ?? null
}

/**
 * After student booking commit: link thread, set booking_id on conversation, system message.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {{
 *   bookingId: string
 *   propertyId: string
 *   tenantUserId: string
 *   tenantProfileId: string
 *   conversationIdHint?: string | null
 * }} opts
 */
export async function attachBookingToConversationOnCreate(admin, opts) {
  const hint =
    typeof opts.conversationIdHint === 'string' ? opts.conversationIdHint.trim() : ''

  let conv = null

  if (hint) {
    const { data, error } = await admin.from('conversations').select('*').eq('id', hint).maybeSingle()
    if (error) {
      console.warn('[bookingConversation] invalid hint lookup', error.message)
    } else if (
      data &&
      data.property_id === opts.propertyId &&
      data.tenant_user_id === opts.tenantUserId
    ) {
      conv = data
    } else {
      console.warn('[bookingConversation] conversationId hint rejected (participant/property mismatch)')
    }
  }

  if (!conv) {
    const { data, error } = await admin
      .from('conversations')
      .select('*')
      .eq('property_id', opts.propertyId)
      .eq('tenant_user_id', opts.tenantUserId)
      .maybeSingle()
    if (error) {
      console.warn('[bookingConversation] conversation lookup', error.message)
      return
    }
    conv = data
  }

  if (!conv) return

  const { error: bookErr } = await admin
    .from('bookings')
    .update({ conversation_id: conv.id })
    .eq('id', opts.bookingId)

  if (bookErr) {
    console.error('[bookingConversation] set booking.conversation_id', bookErr)
    return
  }

  if (!conv.booking_id) {
    const { error: convBookErr } = await admin
      .from('conversations')
      .update({ booking_id: opts.bookingId })
      .eq('id', conv.id)
    if (convBookErr) {
      console.error('[bookingConversation] set conversations.booking_id', convBookErr)
    }
  }

  if (!conv.tenant_profile_id && opts.tenantProfileId) {
    await admin
      .from('conversations')
      .update({ tenant_profile_id: opts.tenantProfileId })
      .eq('id', conv.id)
      .is('tenant_profile_id', null)
  }

  await insertSystemMessage(admin, conv.id, {
    event: 'booking_requested',
    bookingId: opts.bookingId,
  })
}

/**
 * On landlord confirm success: unlock contact + system line.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} bookingId
 * @param {{ landlordUserId?: string | null }} [opts]
 */
export async function unlockConversationOnBookingConfirmed(admin, bookingId, opts = {}) {
  const { data: booking, error: bErr } = await admin
    .from('bookings')
    .select('id, conversation_id, property_id, student_id')
    .eq('id', bookingId)
    .maybeSingle()

  if (bErr || !booking) {
    if (bErr) console.warn('[bookingConversation] booking load for unlock', bErr.message)
    return
  }

  const conv = await resolveConversationForBooking(admin, booking)
  if (!conv) return

  if (conv.contact_unlocked_at) return

  if (!booking.conversation_id) {
    await admin.from('bookings').update({ conversation_id: conv.id }).eq('id', bookingId)
  }

  const nowIso = new Date().toISOString()
  const { error: unlockErr } = await admin
    .from('conversations')
    .update({ contact_unlocked_at: nowIso })
    .eq('id', conv.id)
    .is('contact_unlocked_at', null)

  if (unlockErr) {
    console.error('[bookingConversation] unlock conversation', unlockErr)
    return
  }

  await insertSystemMessage(admin, conv.id, {
    event: 'contact_unlocked',
    bookingId,
    senderUserId: opts.landlordUserId ?? null,
  })
}
