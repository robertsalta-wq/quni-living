# Peer messaging - chunk 1 review

**Migration:** `supabase/migrations/20260527120000_peer_messaging.sql`  
**Types:** `src/lib/database.types.ts`, `src/lib/messaging/conversationTypes.ts`

Apply on linked Supabase (when ready):

```bash
npx supabase db push --linked
# then regenerate types if you prefer generated output:
# npx supabase gen types typescript --project-id <id> > src/lib/database.types.ts
```

## What shipped in chunk 1

| Item | Notes |
|------|--------|
| `conversations` | Unique `(property_id, tenant_user_id)`; trigger fills landlord fields from property |
| `conversation_messages` | `sender_user_id` required for `kind=user`, nullable for `kind=system` |
| `message_contact_mask_events` | Admin SELECT only; no `authenticated` grant |
| `bookings.conversation_id` | FK to conversations |
| `booking_messages` | INSERT revoked + insert policies dropped (frozen) |
| Realtime | `conversation_messages`, `conversations` on `supabase_realtime` |
| `platform_config` | `contact_masking_enabled` = `true` |
| Backfill | Enquiries with `student_id`; skips anonymous; links bookings |

## SQL smoke tests (after apply)

```sql
-- Tables exist
select count(*) from public.conversations;
select count(*) from public.conversation_messages;

-- RLS on
select relname, relrowsecurity from pg_class
where relname in ('conversations', 'conversation_messages', 'message_contact_mask_events');

-- booking_messages frozen for authenticated
select has_table_privilege('authenticated', 'public.booking_messages', 'INSERT'); -- expect false

-- Helper
select public.is_conversation_participant('00000000-0000-0000-0000-000000000000'); -- false when not participant

-- Config seed
select config_key, config_value from public.platform_config
where config_key = 'contact_masking_enabled';
```

## Before chunk 2

- [ ] Migration applied to staging/production
- [ ] Spot-check backfill counts vs `enquiries` where `student_id is not null`
- [ ] Confirm anonymous enquiry count acceptable as legacy-only

**Stopped here** - chunk 2 (API: `open`, `message`, `read`, notify) not started.
