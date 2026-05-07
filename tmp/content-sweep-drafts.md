# Content sweep — policy drafts for review

These drafts are **not** yet merged into the live `/refunds` page or Terms §§ **6.1** / **7.3** (full prose).

**Already shipped in code (for alignment):** Terms **§4.4** bond paragraph uses neutral custody language; **§6.4** links to `/refunds`; footer links **Refund Policy**; `/refunds` is a short placeholder until the tables below are approved and pasted in.

---

## Canonical bond-neutral paragraph (mechanical sweep baseline)

Use wherever tenancy-state neutral wording is required:

> Bond is held by the landlord or lodged with the relevant state or territory bond authority, depending on your tenancy type. Quni does not hold bond money for any tenancy.

**Listing vs Managed (custody nuance, optional addition where helpful)**  
On **Quni Listing**, bond and weekly rent are paid directly between landlord and renter; Quni does not custody those tenancy funds. On **Quni Managed**, tenancy money may pass briefly through Quni before payout via Stripe Connect; bond remains tenancy money governed by state rules, not a Quni fee.

---

## New `/refunds` page — proposed copy

### Intro

Quni administers refunds only for money **Quni actually receives or custodies** through Stripe or its operating accounts. Tenancy bond and rent are **not Quni fees**. Where bond or rent is paid directly between landlord and renter (including off-platform after introduction), refund rights follow **your tenancy agreement** and **state or territory law**, not this policy.

Link out: state tribunal / authority sites as relevant.

---

### Table A — Quni Listing (landlord acceptance fee)

Applies to **landlords** on Quni Listing only. Renters pay **no** booking, platform, service, or surcharge fees to Quni.

| Situation | Refund of the Listing acceptance fee ($99, subject to change at booking) |
|-----------|-----------------------------------------------------------------------------|
| Booking request expires before the landlord accepts | **Full refund** of any acceptance fee already charged when wiring lands — typically automatic once Stripe settles states; contact hello@quni.com.au if unclear. |
| Landlord declines the booking before acceptance | **Full refund** of any acceptance fee charged to the landlord in line with the decline flow. |
| Duplicate / erroneous charge | **Full refund** after verification. |
| Landlord accepted the booking; tenancy proceeds | **No refund** — the fee covers acceptance and platform use for that booking. |

_Note: Acceptance fee collection at landlord confirm is **scheduled for product wiring** (Phase 3). Until then, treat this table as the intended commercial policy._

---

### Table B — Quni Managed (escrow and tenancy money Quni touches)

Renters still pay **no** Quni booking/platform/service/surcharge fees. The **7% service fee** is deducted from **weekly rent** paid through Stripe Connect (`application_fee_percent`) — it is not an extra line item charged to the renter.

| Situation | Deposit / rent held via Quni |
|-----------|------------------------------|
| Booking declined or expires before confirmation | **Deposit hold released or refunded** per automated flows where applicable; timing follows Stripe (typically **5–7 business days** to the card/bank). |
| Booking confirmed; tenancy starts | **Deposit** handling follows your tenancy agreement and confirmation flows — not “extra Quni fees”. **Weekly rent** is tenancy money collected and transferred under Stripe Connect; service fee retained by Quni as disclosed at pricing. |
| Charge error / duplicate | Corrected after verification. |

---

### Bond refunds

Cash bonds and tribunal outcomes are governed by **state or territory residential laws** and **bond authorities**. **Quni does not set bond refund outcomes** and does not replace tribunal processes.

---

## Terms — proposed §§ 6.1, 6.4, 7.3 (replace existing paragraphs under those headings)

### 6.1 Fees (replace “Platform Fees” heading label optional → “Fees”)

Quni offers **Quni Listing** and **Quni Managed**. Fees depend on the landlord’s chosen tier and are shown when you list or book.

**Renters** pay **no** booking fee, platform fee, service fee, or card surcharge to Quni in either tier. You may still pay **tenancy money** (for example **bond** and **rent**) to your landlord or through payment flows that lawfully handle tenancy funds.

**Landlords** on **Quni Listing** pay a **flat acceptance fee** per accepted booking (amount shown on the pricing page and in the product). **Landlords** on **Quni Managed** pay a **percentage of weekly rent** while a managed tenancy is active, collected in line with our payment provider integration. Fee details may change with notice; the terms in effect at the time of the relevant action apply.

### 6.4 Refunds (augment link to site page)

Refund and reversal rules for **fees and charges that Quni actually receives** are set out in our [Refund Policy](/refunds) on the website. **Bond and rent** (tenancy money) are governed by your **tenancy agreement** and **applicable state or territory law**; Quni does not use the Refund Policy to override those obligations.

### 7.3 Limitation of liability (student/renter and fee language)

To the maximum extent permitted by Australian law, Quni Living’s liability to you for any loss or damage arising from your use of the Platform is limited to **the greater of (a) the total of Quni fees actually paid by you in the three months preceding the relevant claim** and **(b) one hundred dollars (AUD)**, if (a) is zero because you are a renter who does not pay Quni fees. We are not liable for any indirect, consequential, or special loss or damage.

Nothing in these Terms excludes or limits any guarantee, warranty, or right that cannot be excluded or limited under the Australian Consumer Law.

---

## Changelog for reviewers

- Aligns with **renters pay zero Quni fees**; **Listing** landlord **$99** per accepted booking (wiring Phase 3); **Managed** **7%** of weekly rent via Connect; bond/rent are **tenancy money** with custody as per tier (see neutral paragraph).  
- Terms liability cap updated so **$0-fee renters** still have a sensible cap (fee-based cap alone can be $0).
