# FT6600 - Authoritative correct-fill spec (NSW Standard Residential Tenancy Agreement)

Derived from the real field/label coordinates in the latest build's flattened draft
(`nsw_residential_tenancy_agreement_draft__4_.pdf`), cross-referenced to the printed
form labels page by page. This is the GROUND-TRUTH target for `officialNswFt6600Fill.ts`.

Booking used for this audit (single tenant; co-tenant booking still needs a separate pass):
- Landlord (host): Quinn Lee - +61410025719 - 18 Malvina Street, Ryde NSW 2112 - quinniele90@gmail.com
- Tenant: Robert Saltalamacchia - +61425775308 - rob@3thingsatonce.com.au
- Premises: Unit 406/311 Hume Highway, Liverpool NSW 2170
- Term: 10/06/2026 → 10/12/2026 (6 months)
- Rent: $400.00 / week, due Wednesday, first payment 10/06/2026, direct deposit (QUINNVESTMENTS PTY LTD, BSB 939-200, Acct 823175945)
- Bond: $800.00, lodged via Rental Bond Online
- Max occupants: 2

---

## ROOT CAUSE (read first)

The FT6600 has **repeated field labels in five separate blocks**:
`Suburb`, `State`, `Postcode`, `Contact details`, `Telephone`, `Agent name`, `Business address`
each appear under: Corporation / Landlord / Landlord's-agent / Tenant / Tenant's-agent.

The current fill matches a value to a field by **label/description text alone**, so it lands
in the wrong instance (e.g. tenant name → Corporation's `State`). Plus the landlord block is
offset up by one slot.

**Fix = bind each value to a field by (section + position), not by label text.**
Dump every field's `{name, page, rect}` from the BLANK official form, group fields by the
section header they sit under (using their y-position relative to the printed section labels),
then map within each section by reading order. Lock the resulting name→slot map in the
regression test.

Legend below: ✅ correct · ❌ wrong (with what it currently shows) · ⚠️ needs a data/source decision

---

## PAGE 1 - Agreement header + Landlord

| Slot (printed label) | Correct value | Current build |
|---|---|---|
| THIS AGREEMENT WAS MADE ON | `03/06/2026` | ✅ |
| AT | `Liverpool` | ✅ |
| Landlord Name (1) | `Quinn Lee` | ❌ empty (name landed in the box ABOVE this) |
| Landlord Name (2) | *(empty - one landlord)* | ❌ shows `+61410025719` |
| Landlord telephone or other contact details | `+61410025719` | ❌ empty |
| If not in NSW, the State/Territory/country | *(empty - landlord is in NSW)* | ❌ shows `+61410025719` |
| Landlord's telephone (if no agent) | `+61410025719` *(or empty if already given above)* | ❌ shows `18 Malvina Street` |
| Business/residential address of landlord for service | `18 Malvina Street` | ❌ shows `Ryde` |
| Suburb | `Ryde` | ❌ shows `NSW` |
| State | `NSW` | ❌ shows `2112` |
| Postcode | `2112` | ❌ empty |

Pattern: landlord block shifted **up one slot**; address sub-block (street/suburb/state/postcode) each shifted one column.

## PAGE 2 - Corporation / Tenant / Agents

| Slot | Correct value | Current build |
|---|---|---|
| Corporation Name / Business Address / Suburb / State / Postcode | *(all empty - individual landlord)* | ❌ Corp `State` shows `Robert Saltalamacchia` |
| Tenant Name (1) | `Robert Saltalamacchia` | ❌ empty |
| Tenant Name (2) | *(empty - no co-tenant on this booking)* | ✅ empty |
| Tenant Name (3) / All other tenants | *(empty)* | ✅ empty |
| Tenant's address for service (street) | ⚠️ tenant's address for service - confirm source (NOT "workplace address") | ❌ empty |
| Tenant Suburb / State / Postcode | ⚠️ per tenant address | ❌ tenant `State` shows `Phone: +61425775308` |
| Tenant Contact details | `Phone: +61425775308 · Email: rob@3thingsatonce.com.au` | ❌ empty |
| Landlord's agent (all fields) | *(empty - no agent)* | ✅ empty |
| Tenant's agent (all fields) | *(empty - no agent)* | ❌ Suburb=`10/06/2026`, Postcode=`10/12/2026`, Contact=`Unit 406/311 Hume Highway…` |

## PAGE 3 - Term / Premises / Rent

| Slot | Correct value | Current build |
|---|---|---|
| Term checkbox | ☑ **6 months** only | ❌ `2 years` + `Other` + `Periodic` all ticked |
| Other (please specify) | *(empty)* | ❌ shows `400.00` |
| starting on | `10/06/2026` | ❌ empty |
| and ending on | `10/12/2026` | ❌ empty |
| Residential premises are (address) | `Unit 406/311 Hume Highway, Liverpool, NSW, 2170` | ❌ shows the direct-deposit payment string |
| Residential premises include (inclusions) | ⚠️ listing inclusions, else empty | ❌ empty |
| The rent is $ | `400.00` | ❌ shows `Day due: Wednesday` |
| Rent must be paid per | ☑ **week** | ❌ `Other` ticked with `2` |
| Day rent must be paid | `Wednesday` | ❌ shows `Quinn Lee` |
| Date first rent payment is due | `10/06/2026` | ❌ shows `+61410025719` |
| Rent must be paid by | ☑ **approved electronic bank transfer** | ❌ none ticked |
| Details of payment method | `Direct deposit - Account name: QUINNVESTMENTS PTY LTD; BSB: 939-200; Account number: 823175945` | ❌ shows `Quinn Lee` |

## PAGE 4 - Bond / Occupants / Repairs / Water / Smoke

| Slot | Correct value | Current build |
|---|---|---|
| A rental bond of $ | `800.00` | ❌ shows `+61410025719` |
| Bond provided to | ☑ **NSW Fair Trading through Rental Bond Online** | ✅ |
| No more than __ persons (max occupants) | `2` | ❌ empty |
| Electrical repairs / Telephone | ⚠️ nominated tradesperson, else empty | ✅ empty |
| Plumbing repairs / Telephone | ⚠️ tradesperson name / phone, else empty | ❌ `800.00` / `Quinn Lee` |
| Other repairs / Telephone | *(empty)* | ✅ empty |
| Water usage - pay separately? | ☑ **No** (bills included) | ⚠️ verify |
| Electricity embedded network? | ☑ No *(unless known)* | ⚠️ verify |
| Gas embedded network? | ☑ No *(unless known)* | ⚠️ verify |
| Smoke alarms - hardwired / battery | ⚠️ **do not default** - capture on listing or leave blank | ❌ `Battery operated` defaulted |

## PAGE 5 - Smoke alarm follow-ups / Strata / E-service

| Slot | Correct value | Current build |
|---|---|---|
| Battery type (text) | *(empty unless battery + replaceable)* | ❌ shows `No` |
| Hardwired back-up battery replaceable? Yes/No | *(only if hardwired)* | ⚠️ verify |
| Strata SMA - owners corp responsible? Yes/No | ☑ exactly ONE | ❌ BOTH Yes and No ticked |
| Strata by-laws applicable? Yes/No | ☑ one | ⚠️ verify |
| Landlord - express consent to e-service? Yes/No | ☑ per actual consent (default **unticked**) | ⚠️ verify - do not pre-tick |
| Landlord email (for service) | `quinniele90@gmail.com` | ✅ position ok |
| Tenant - express consent to e-service? Yes/No | ☑ per actual consent (default **unticked**) | ⚠️ verify - do not pre-tick |
| Tenant email (for service) | `rob@3thingsatonce.com.au` | ✅ position ok |

## PAGES 17–18 - Signatures (DocuSeal tag overlay)

- Landlord Signature + date → landlord signature block (page 17)
- Landlord LIS Signature + date → Landlord Information Statement block (page 17)
- Tenant (1) Signature + date → Tenant (1) block (page 17)
- Tenant TIS Signature + date → Tenant Information Statement block (page 18)
- Tenant (2) → co-tenant block when present (out of scope for this single-tenant booking)
- Tenant (3) / (4) → leave blank (out of scope)

Note: the `{{…}}` tag literals visible on the draft are expected - DocuSeal consumes them on
completion (Option 0). Verify `{{` = 0 on the executed download from this corrected booking.

---

## Implementation method (so it converges, not whack-a-mole)

1. From the BLANK official form, dump every field: `{name, page, rect:[x0,y0,x1,y1]}`.
2. For each printed section header, record its y-band; assign each field to a section by which band its rect falls in.
3. Within a section, sort fields by reading order (y, then x) and map to the slots in the tables above by position - never by label text alone (labels repeat).
4. Build `name → semantic slot` once, encode it in `officialNswFt6600Fill.ts`.
5. Regression test asserts the full `name → slot` map (not just 5 fields) against the spec above.
6. Regenerate this exact booking and visually confirm every ✅/❌ row flips to correct.
