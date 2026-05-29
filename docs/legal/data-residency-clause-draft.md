# Draft: Privacy Policy — “Where we store your data”

**Status:** Lawyer review only. **Do not** publish to `/privacy` until approved.

## Insertion in `src/pages/Privacy.tsx`

After legal sign-off, add this block as a new section **before** the current **§6. Data Storage and Security** (`id="security"`), or merge/replace the first paragraph under §6 if counsel prefers a single storage section.

1. Add a `LegalTocItem`: `{ id: 'data-location', label: '…' }` in the correct ordinal position.
2. Renumber subsequent TOC entries (current §6–§12 become §7–§13) if you insert a new numbered H2.
3. Use `LegalH2`, `LegalH3`, `LegalP`, and `LegalUl` like the rest of the page.

**Anchor id suggestion:** `data-location`

---

## Draft copy (approved text pending)

### Where we store your data

Quni Living is an Australian company, and your core information is stored in Australia.

Your account, listings, bookings, messages, verification documents, signed tenancy agreements, and database backups are stored on AWS infrastructure located in Sydney, Australia (Asia Pacific (Sydney) region — ap-southeast-2). They do not leave Australia for routine storage.

Some supporting services use international infrastructure for the limited purpose of operating the platform:

- Transactional email delivery is handled by Resend.
- Payment processing is handled by Stripe. We do not store payment card details on our own systems.
- Push notifications, if you opt in, are delivered via Firebase Cloud Messaging (Google).
- Error and performance monitoring is provided by Sentry.

Where international processing occurs through these providers, it is governed by their own privacy and data protection commitments and is consistent with our obligations under the Privacy Act 1988 (Cth), including Australian Privacy Principle 8 (cross-border disclosure of personal information).

---

## React sketch (for implementer after approval)

```tsx
<LegalH2 id="data-location">Where we store your data</LegalH2>
<LegalP>
  Quni Living is an Australian company, and your core information is stored in Australia.
</LegalP>
<LegalP>
  Your account, listings, bookings, messages, verification documents, signed tenancy agreements, and
  database backups are stored on AWS infrastructure located in Sydney, Australia (Asia Pacific (Sydney)
  region — ap-southeast-2). They do not leave Australia for routine storage.
</LegalP>
<LegalP>
  Some supporting services use international infrastructure for the limited purpose of operating the
  platform:
</LegalP>
<LegalUl
  items={[
    'Transactional email delivery is handled by Resend.',
    'Payment processing is handled by Stripe. We do not store payment card details on our own systems.',
    'Push notifications, if you opt in, are delivered via Firebase Cloud Messaging (Google).',
    'Error and performance monitoring is provided by Sentry.',
  ]}
/>
<LegalP>
  Where international processing occurs through these providers, it is governed by their own privacy and
  data protection commitments and is consistent with our obligations under the Privacy Act 1988 (Cth),
  including Australian Privacy Principle 8 (cross-border disclosure of personal information).
</LegalP>
```
