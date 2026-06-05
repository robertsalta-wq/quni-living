# Peer messaging - chunk 2 API (manual test)

**Endpoints:** Node runtime on Vercel (`api/conversations/*.ts`)

| Route | Auth |
|-------|------|
| `POST /api/conversations/open` | Bearer Supabase access token |
| `POST /api/conversations/message` | Bearer |
| `POST /api/conversations/read` | Bearer |
| `POST /api/conversations/notify` | `INTERNAL_DOC_FLOW_SECRET` (Bearer or `X-Conversation-Notify-Secret`) |

**Env:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` (or `VITE_SUPABASE_ANON_KEY`), `RESEND_API_KEY`, `PUBLIC_SITE_URL` or `SITE_URL`, `INTERNAL_DOC_FLOW_SECRET` (notify only).

## Local

```bash
npm run dev:vercel
# or: npx vercel dev
```

Set `BASE=http://localhost:3000` (or your dev port).

## 1. Get tokens

Sign in as **tenant** and **landlord** in the app; copy `access_token` from DevTools → Application → localStorage (Supabase session), or use Supabase Auth API.

```text
TENANT_TOKEN=eyJ...
LANDLORD_TOKEN=eyJ...
PROPERTY_ID=<uuid of active listing>
```

## 2. Open conversation (tenant)

```bash
curl -sS -X POST "$BASE/api/conversations/open" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"propertyId\":\"$PROPERTY_ID\"}" | jq
```

Expected: `{ "ok": true, "conversationId": "...", "contactUnlocked": false, "created": true }`

## 3. Send message (tenant)

```bash
CONV_ID=<from open>
curl -sS -X POST "$BASE/api/conversations/message" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"conversationId\":\"$CONV_ID\",\"body\":\"Hi, is this room still available?\"}" | jq
```

With PII (masking + mask_events):

```bash
curl -sS -X POST "$BASE/api/conversations/message" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"conversationId\":\"$CONV_ID\",\"body\":\"Call me 0412 345 678 or email test@example.com\"}" | jq
```

Expected: `displayBody` contains `[contact hidden]`; DB `message_contact_mask_events` rows (admin SQL).

## 4. Landlord reply

```bash
curl -sS -X POST "$BASE/api/conversations/message" \
  -H "Authorization: Bearer $LANDLORD_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"conversationId\":\"$CONV_ID\",\"body\":\"Yes, happy to chat here.\"}" | jq
```

Landlord should receive email with **property title + tenant first name + link only** (no message body).

## 5. Mark read

```bash
curl -sS -X POST "$BASE/api/conversations/read" \
  -H "Authorization: Bearer $LANDLORD_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"conversationId\":\"$CONV_ID\"}" | jq
```

## 6. Notify retry (internal)

```bash
MSG_ID=<messageId from step 3>
curl -sS -X POST "$BASE/api/conversations/notify" \
  -H "Authorization: Bearer $INTERNAL_DOC_FLOW_SECRET" \
  -H "Content-Type: application/json" \
  -d "{\"conversationId\":\"$CONV_ID\",\"messageId\":\"$MSG_ID\"}" | jq
```

## 7. Negative cases

| Case | Expected |
|------|----------|
| No Authorization | 401 |
| Landlord `open` on new property (no thread) | 403 |
| Wrong `conversationId` | 404 |
| Empty body | 400 |
| `notify` without secret | 401 |

## Automated tests

```bash
npm test -- src/lib/messaging/maskContactInfo.test.ts api/lib/messaging/conversationNotify.test.ts
```

**Stopped before chunk 3 (UI).**
