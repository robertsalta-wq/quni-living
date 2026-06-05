# Content sweep - policy drafts for review

These drafts are **not** yet merged into the live `/refunds` page or Terms §§ **6.1** / **7.3** (full prose).

**Already shipped in code (for alignment):** Terms **§4.4** bond paragraph uses neutral custody language; **§6.4** links to `/refunds`; footer links **Refund Policy**; `/refunds` is a short placeholder until the tables below are approved and pasted in.

**Revision (post-review):** Incorporated conduit-vs-custody wording, Table A/B edits, removal of implementation-detail wording from public copy, simplified §7.3, and a short **draft note** on Managed deposit/bond aligned with current product behaviour (for Table B language only - not legal advice).

---

## Canonical bond-neutral paragraph (mechanical sweep baseline)

Use wherever tenancy-state neutral wording is required:

> Bond is held by the landlord or lodged with the relevant state or territory bond authority, depending on your tenancy type. Quni does not hold bond money for any tenancy.

**Listing vs Managed (conduit vs custody)**  
On **Quni Listing**, bond and weekly rent are paid directly between landlord and renter; Quni does not route those tenancy funds. On **Quni Managed**, bond and rent may **pass through** Quni’s payment infrastructure for a limited time (for example card capture and settlement). That **conduit** role is **not** the same as Quni acting as bond custodian under state bond laws - ultimate lodgement and custody still follow the landlord or the relevant bond authority as the law requires.

---

## New `/refunds` page - proposed copy

### Intro

Quni administers refunds and reversals for money **Quni actually receives** through its payment stack (for example booking deposits and landlord fees processed on-platform). Tenancy **bond** and **rent** are **not Quni fees**. Where bond or rent moves **directly** between landlord and renter, refund rights follow **your tenancy agreement** and **state or territory law**, not this policy.

---

### Table A - Quni Listing (landlord acceptance fee)

Applies to **landlords** on Quni Listing only. Renters pay **no** booking, platform, service, or surcharge fees to Quni.

| Situation | Refund of the Listing acceptance fee ($99, subject to change at booking) |
|-----------|-----------------------------------------------------------------------------|
| Landlord declines the booking before acceptance | **Full refund** of any acceptance fee charged to the landlord in line with the decline flow. |
| Duplicate / erroneous charge | **Full refund** after verification. |
| Landlord accepted the booking; tenancy proceeds | **No refund** - the fee covers acceptance and platform use for that booking. |
| Tenancy unwinds after acceptance (cancellation / mutual exit) | **Fee treatment** depends on what was charged and why the booking unwound; contact **hello@quni.com.au** with your booking reference. |

_Note: Listing acceptance fees are not yet charged automatically at landlord confirm in all flows; until billing is fully wired, alignment with this table is handled case-by-case via **hello@quni.com.au**._

---

### Table B - Quni Managed (tenancy money Quni routes)

Renters pay **no** booking, platform, service, or surcharge fees to Quni. On Managed, **weekly rent** includes a **service component** retained by Quni as disclosed on the pricing page - it is **not** an extra line item on top of rent charged to the renter.

| Situation | Deposit / rent |
|-----------|------------------|
| Booking declined or expires before landlord confirmation | **Deposit hold released or refunded** per automated flows where applicable; timing follows your bank/card network (typically **5–7 business days**). |
| Booking confirmed; tenancy proceeds | **Deposit, bond, and ongoing rent after confirmation** are governed by your **tenancy agreement**, applicable law, and the payment flows you complete at booking - **not fully restated in this policy.** Use **hello@quni.com.au** for questions about **platform-side** payments or reversals. |
| Booking cancelled **after** landlord confirmation | Same as row above: outcomes depend on tenancy terms, timing, and what has already been captured or paid - contact **hello@quni.com.au** for platform administration; bond and rent disputes outside money Quni custodies follow tribunal or authority processes. |
| Charge error / duplicate | Corrected after verification. |

---

### Bond refunds

Cash bonds and tribunal outcomes are governed by **state or territory residential laws** and **bond authorities**. **Quni does not set bond refund outcomes** and does not replace tribunal processes.

---

### Draft note - Managed deposit & bond (product-aligned, for wording only)

_Use this internally so Table B stays accurate; do not paste verbatim as legal advice._

- **Booking deposit:** Authorised as a PaymentIntent when the renter submits a request; **captured when the landlord confirms** the booking in product. Settlement follows Stripe; amounts are recorded against the booking for reporting.
- **Weekly rent:** Collected on the managed rent cadence after confirmation; landlord remuneration net of the disclosed managed service component.
- **Bond:** Modelled as **tenancy money**, not a Quni fee. Lodgement timing and custody follow **state rules** and your agreement; platform copy should continue to distinguish **payment routing** from **bond custodian** status.

---

## Terms - proposed §§ 6.1, 6.4, 7.3 (replace existing paragraphs under those headings)

### 6.1 Fees (replace “Platform Fees” heading label optional → “Fees”)

Quni offers **Quni Listing** and **Quni Managed**. Fees depend on the landlord’s chosen tier and are shown when you list or book.

**Renters** pay **no** booking fee, platform fee, service fee, or card surcharge to Quni in either tier. You may still pay **tenancy money** (for example **bond** and **rent**) to your landlord or through payment flows that lawfully handle tenancy funds.

**Landlords** on **Quni Listing** pay a **flat acceptance fee** per accepted booking (amount shown on the pricing page and in the product). **Landlords** on **Quni Managed** pay a **percentage of weekly rent** while a managed tenancy is active, collected as part of managed rent flows via our payment provider. Fee details may change with notice; the terms in effect at the time of the relevant action apply.

### 6.4 Refunds (augment link to site page)

Refund and reversal rules for **fees and charges that Quni actually receives** are set out in our [Refund Policy](/refunds) on the website. **Bond and rent** (tenancy money) are governed by your **tenancy agreement** and **applicable state or territory law**; Quni does not use the Refund Policy to override those obligations.

### 7.3 Limitation of liability

To the maximum extent permitted by Australian law, Quni Living’s liability to you for any loss or damage arising from your use of the Platform is limited to **the fees you paid to Quni in the three months before the relevant claim**, or **AUD $100** if that amount is zero (for example because you are a renter who pays no fees to Quni). We are not liable for any indirect, consequential, or special loss or damage.

Nothing in these Terms excludes or limits any guarantee, warranty, or right that cannot be excluded or limited under the Australian Consumer Law.

---

## Changelog for reviewers

- **Renters:** zero Quni fees. **Listing landlords:** flat acceptance fee per accepted booking (billing completion in product ongoing). **Managed landlords:** percentage of weekly rent via managed rent flows. **Bond:** conduit vs custody clarified; bond remains tenancy money under state rules.
- **§7.3:** simplified single cap (fees in three months, else AUD $100 for zero-fee renters).
