# Build prompt - VIC on-site licence to occupy (Part A)

**Status:** Ready for implementation (lawyer-review draft PDF only).  
**Audience:** Cursor / Claude agent implementing React-PDF.  
**Last updated:** June 2026

---

## Scope

Build the **Victoria on-site / boarder–lodger** arrangement as a **single reviewable PDF**, Part A style: **build + render only**. This document covers **VIC on-site owners only** (`private_room_landlord_on_site`).

**Do not:**

- Change `vic.ts`, `tenancyGeneratorToApiPath`, `resolveTenancyPackage`, or the confirm flow
- Wire DocuSeal or any live document generation path
- Change NSW/QLD templates
- Copy legal text from `api/documents/OccupancyAgreement.js` (NSW) or `QuniOccupancyAgreementQld.tsx` (QLD) - both are framed as RTA tenancies, lodge bond with an authority, and charge a **resident-facing platform fee**. That frame and fee posture are **wrong** for this document

**Sequencing (do not skip):** A separate **publish gate** must land before VIC goes live and **before** `vic.ts` T1 is aligned to landlord-held security deposit and the resolver points at this generator. Building this PDF now is safe; wiring is later.

---

## Engineering

Mirror the **VIC T2 Form 1 Part A** pattern:

| Artifact | Path |
|----------|------|
| Clause / narrative copy | `src/lib/documents/vic/occupancyContent.ts` |
| React-PDF generator | `src/lib/documents/vic/occupancyGenerator.tsx` |
| Sample render script | `scripts/test-vic-occupancy-t1.mjs` |

**Sample PDF output:** `scripts/test-vic-occupancy-t1.pdf` (already gitignored via `scripts/*.pdf` in `.gitignore`).

**Run:** `npx tsx scripts/test-vic-occupancy-t1.mjs`  
**Typecheck:** `npx tsc -b --noEmit` must pass.

**Technical choices:**

- Sample data: `OccupancyAgreementProps` from `api/documents/rtaTypes.ts` only - **do not** extend `rtaTypes.ts` for Part A
- Styling: `quniDocumentPdfTheme` **OccupancyMatch** components (`OccupancyMatchFixedHeader`, `OccupancyMatchFooter`, `OccupancyMatchSectionHeading`, `occupancyMatchPdf`, etc.) for consistency with `addendumGenerator.tsx`
- Checkboxes: **`X`** not ✓ (`@react-pdf/renderer` + Helvetica)
- `globalThis.React = React` in the test script before dynamic imports (same as `test-vic-form1.mjs`)
- Prefer typed TSX (no `@ts-nocheck`) so `tsc` passes

**Document header (OccupancyMatch subtitle example):**  
`Victoria - Licence to occupy (on-site accommodation)`

Optional footer on every page: `Draft for legal review - not for execution` (small, muted).

---

## Terminology discipline (critical)

Use **licence vocabulary throughout the PDF body**. This protects the licence characterisation.

| Use | Never use in body |
|-----|-------------------|
| licence, licence fee, accommodation fee, weekly licence fee | rent, lease, tenancy |
| resident, occupant | tenant, renter |
| owner | landlord, rental provider |
| security deposit | bond |
| licence period, duration | lease length, lease |

- **Do not** print the label **“Tier 1”** (or T1/T2) anywhere in the document body.
- Props may still use `landlord`, `tenant`, `rent`, `bond` in TypeScript - **map labels only in the PDF** (e.g. `props.tenant.fullName` → “Resident”).

---

## Props → PDF mapping rules

`OccupancyAgreementProps` is the only props type. Implement these rules in the generator:

1. **Weekly amount:** Display **`rent.weeklyRent`** as the **weekly licence fee** / **accommodation fee**.  
   **Do not** print `rent.totalWeekly`, `rent.platformFeePercent`, “platform fee”, or “total weekly payment” anywhere in the body or summary schedule.

2. **Duration:** Use `term.leaseLengthDescription` as data but label the row **“Licence period”** or **“Duration”**, not “Lease length”.

3. **Premises:** You may use `premises.roomType`, `premises.addressLine`, furnished/linen/cleaning flags.  
   **Do not** print `premises.propertyType` or the words `property_type` in the body.

4. **Co-resident:** `OccupancyAgreementProps` has a single `tenant`. A second occupant may appear only via `specialConditions` / `bookingNotes` until types are extended later.

5. **House rules:** If `houseRules` is non-empty, render under the House rules section; otherwise use static defaults from `occupancyContent.ts`.

6. **Security deposit copy:** Hardcode landlord-held / owner-held wording in `occupancyContent.ts`. **Do not** `import` from `vic.ts`. Add a code comment: `// Bond-rule wiring will align with vic.ts when T1 resolver is connected.`

---

## Platform & service fee block

Same **compliance posture** as `addendumGenerator.tsx` / VIC addendum - **wording policy**, not a full `QuniPlatformAddendumProps` port for Part A:

- **Owner-side** service fee only (e.g. “10% of gross weekly licence fee deducted from amounts payable to the owner through the platform”) - never say “landlord-side” in the PDF
- Explicit **resident carve-out:** no Quni platform fee, booking fee, or resident service fee; the agreed weekly licence fee is **not** increased by the owner-side service fee
- **Fee-free bank transfer** remains available for recurring licence-fee payments (statutory-style neutral wording for Victoria; no RTA citation required)
- **Condition report** - short reference (ingoing/outgoing may be prepared; resident opportunity to comment) aligned with VIC addendum tone but adapted to licence / owner / resident labels
- Sample BSB/account lines: use **static template lines** in `occupancyContent.ts` or generic “direct credit details provided by the owner” unless the test script passes extra strings via `specialConditions` - do not extend `rtaTypes.ts` for bank details in Part A

Do **not** include move-out fee schedules (late checkout, international transfer) in this Part A draft unless explicitly added later after lawyer sign-off on the separate addendum-fees question.

---

## Clauses to draft (`occupancyContent.ts` + generator sections)

Write all narrative **fresh** for Victoria (draft for lawyer review). Use **owner / resident** labels; **no RTA / RTBA / VCAT-under-RTA** framing.

### 1. Nature of arrangement

Opening clause stating expressly:

- This is a **common-law licence** to occupy a **specified room**
- The **owner resides on the premises** and retains overall **control, possession and management** of the whole property
- The resident is **not** granted **exclusive possession**
- This is **not** a residential tenancy; the *Residential Tenancies Act 1997* (Vic) **does not apply**
- No **Residential Tenancies Bond Authority (RTBA)** lodgement

### 2. Room & shared areas

- Identify the **allocated bedroom** (from schedule / `roomType` / address)
- State expressly that **kitchen, bathroom and living areas** are **shared with the owner**

### 3. Owner’s right of entry

- The owner may enter the **allocated room** for cleaning, maintenance or inspection - **without statutory tenancy notice requirements** - to reinforce that exclusive possession is not granted
- **Avoid** any “resident may lock the room and exclude the owner” or absolute sole-occupancy framing
- *Legal review flag:* counsel may soften to “reasonable notice except emergency”; keep the draft as written and note in the delivery report

### 4. Financial terms

- Weekly **licence fee** (amount from `weeklyRent`)
- Payment frequency and method (`rent.paymentMethod` mapped to plain language)
- What **utilities** are included (static default + optional `specialConditions` / listing notes)

### 5. Security deposit

- Amount (`bond.amount`), return conditions, held **directly by the owner**
- Owner must give the resident a **written receipt**
- **No** authority lodgement

### 6. Termination

- **Reasonable notice** aligned to the **licence-fee payment cycle** (e.g. **one week’s notice** where the fee is payable weekly; use “one to two weeks” only where the payment cycle is fortnightly or longer)
- Stated **grounds** (non-payment, serious breach, mutual agreement, etc.) in operational language
- **No** NCAT/RTA termination tables or prescribed statutory notice periods

### 7. Australian Consumer Law

Short standalone clause: the RTA may not apply, but **Australian Consumer Law** (unfair contract terms / misleading or deceptive conduct) **still applies**.

### 8. House rules

Operational tone (not Act-schedule style): guests / overnight visitors, noise, cleaning, smoking, pets, common areas, utilities. Merge `houseRules` when provided.

### 9. Care of room and shared areas (recommended)

Brief bullets: resident keeps allocated room and shared areas reasonably clean; report damage promptly; no intentional damage or nuisance.

### 10. Disputes (recommended)

Parties attempt good-faith resolution; unresolved disputes may be referred to **courts of Victoria** with jurisdiction (not VCAT under the RTA).

### 11. Execution / signatures

Short block: owner and resident names, signature lines, date lines. DocuSeal merge tags optional as static placeholder text for future wiring - **no DocuSeal integration in Part A**.

Render `specialConditions` and `bookingNotes` when non-empty (before signatures).

---

## Delivery report (required)

When the task completes, report:

1. **Files created/changed**
2. **Sample PDF path** (`scripts/test-vic-occupancy-t1.pdf`)
3. **Phrasing flagged for legal review**, especially:
   - Owner entry to the allocated room without statutory notice
   - Non-exclusive possession / no lock-out of owner
   - Notice period vs payment cycle
   - ACL scope wording
4. Confirm: no `totalWeekly` / platform fee in PDF; no `property_type` in body; no tenancy vocabulary in body

---

## Reference (do not copy legal text)

| Doc | Why not |
|-----|---------|
| `api/documents/OccupancyAgreement.js` | NSW RTA 2010 tenancy; Fair Trading bond; resident platform fee |
| `src/lib/documents/QuniOccupancyAgreementQld.tsx` | QLD RTA bond lodgement; resident platform fee |
| `src/lib/documents/vic/form1Content.ts` | Prescribed Form 1 - wrong instrument for on-site licence |

**Do mirror:** `src/lib/documents/vic/form1Generator.tsx` + `scripts/test-vic-form1.mjs` (structure), `src/lib/documents/vic/addendumGenerator.tsx` (fee posture).
