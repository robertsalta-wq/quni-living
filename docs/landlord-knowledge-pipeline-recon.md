# Landlord knowledge pipeline — shape reconnaissance

**Status:** Read-only. No schema design, no rule content, no pipeline changes.  
**Date:** 26 July 2026  
**Follows:** `docs/landlord-source-audit.md`  
**Method:** Repo files and migrations only. No production writes. No second content audit.

---

## 1. Sync pipeline + `knowledge_base` row schema

### Mechanism (how seed reaches Supabase)

Documented in `docs/ai-knowledge-sync.md`:

- **Seed file:** `scripts/knowledgeData.json`
- **Runtime store:** Supabase `knowledge_base` (vector search via `api/lib/knowledgeRetrieval.ts`)
- **Not** a build step, **not** an edge function for seed. It is a **manual script** run after editing seed/admin content:

```bash
node scripts/run-with-env.mjs npx tsx scripts/seedKnowledge.ts
# or: npm run seed:knowledge
```

Feature-inventory sync (optional precursor) copies inventory sections into the seed JSON, then the same re-seed:

```bash
npx tsx scripts/syncFeatureInventoryKnowledge.ts
npm run seed:knowledge
```

**Embeddings / RAG:** Yes. Chat embeds the user question and retrieves top matching chunks (similarity ≥ 0.7). Embeddings are generated at seed/admin write time via OpenAI (`text-embedding-3-small`, 1536 dims) in `api/lib/embeddings.ts`, called from:

- `scripts/seedKnowledge.ts` — `generateEmbedding(\`${title}\n\n${content}\`)` then upsert into `knowledge_base`
- `api/admin/knowledge.ts` — re-embed on admin create/update

Runtime retrieval embeds the **query** in `api/lib/knowledgeRetrieval.ts` and calls RPC `match_knowledge_base`.

Relevant seed upsert (exact):

```75:87:scripts/seedKnowledge.ts
    process.stdout.write(`  [${i + 1}/${entries.length}] ${title.slice(0, 60)}… `)
    const embedding = await generateEmbedding(`${title}\n\n${content}`)
    const { error } = await admin.from('knowledge_base').upsert(
      {
        id,
        title,
        content,
        category,
        state: state && String(state).trim() ? String(state).trim() : null,
        embedding,
      },
      { onConflict: 'id' },
    )
```

### Exact `knowledge_base` column schema

From `supabase/migrations/20260406150000_knowledge_base_rag.sql` (only CREATE for this table; later migration `20260415140000_knowledge_base_select_authenticated.sql` adds RLS SELECT only — no column changes found in migrations):

```6:15:supabase/migrations/20260406150000_knowledge_base_rag.sql
create table if not exists public.knowledge_base (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  category text not null,
  state text,
  embedding vector(1536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

| Column | Type |
| --- | --- |
| `id` | `uuid` PK, default `gen_random_uuid()` |
| `title` | `text` not null |
| `content` | `text` not null |
| `category` | `text` not null |
| `state` | `text` (nullable) |
| `embedding` | `vector(1536)` |
| `created_at` | `timestamptz` not null default `now()` |
| `updated_at` | `timestamptz` not null default `now()` |

### Citation / dating / confidence columns (yes/no)

| Need | Present? | Quote |
| --- | --- | --- |
| (a) source / citation URL | **No** | — |
| (b) effective or last-checked date | **No** | — |
| (c) review / expiry date | **No** | — |
| (d) confidence or verified flag | **No** | — |

`created_at` / `updated_at` are row timestamps only, not content-effective or review dates. No later migration in this repo adds citation/date/confidence columns.

**Implication for rule-map feed:** Extending `knowledge_base` with source/date/verified fields would require a **schema migration**. A clean extension of the current seed shape (`id`, `title`, `content`, `category`, `state`) alone cannot carry those fields.

---

## 2. Typed tenancy rules shape

### Full TypeScript types (`api/lib/tenancy/rules/types.ts`)

```5:45:api/lib/tenancy/rules/types.ts
/** Bond rules when the statutory lodgement scheme does not apply (e.g. NSW T1 boarder/lodger). */
export interface TenancyBondRulesSchemeOff {
  schemeApplies: false
  maxBondCopy: null
  authority: null
  authorityUrl: null
  maxBondMonths: null
  lodgementDays: null
  lodgementDaysUnit: null
  receiptDays: null
  authorityPublicLabel: null
  /** Landlord-held acknowledgement checkbox - regulator named (e.g. NSW Tier 1 boarder/lodger) */
  landlordAckAuthorityName: string | null
}

/** Bond rules when bond must be lodged with the state authority. */
export interface TenancyBondRulesSchemeOn {
  schemeApplies: true
  /** Tenant-facing statutory cap sentence after bond amount; null to omit. */
  maxBondCopy: string | null
  authority: string
  authorityUrl: string
  maxBondMonths: number | null
  lodgementDays: number
  /**
   * How lodgementDays should be read in tenant-facing copy.
   * NSW/VIC use business days; QLD RTRA uses calendar days for the lodgement period.
   */
  lodgementDaysUnit: 'business' | 'calendar'
  receiptDays: number | null
  /** Line shown under “{STATE} - state bond authority” on the bond step */
  authorityPublicLabel: string
  landlordAckAuthorityName: null
}

export type TenancyBondRules = TenancyBondRulesSchemeOff | TenancyBondRulesSchemeOn

/** Future: tribunal, terminology, notices, minStandards - add when a consumer exists. */
export interface TenancyRules {
  bond: TenancyBondRules
}
```

### One concrete entry (`api/lib/tenancy/rules/nsw.ts`)

```19:30:api/lib/tenancy/rules/nsw.ts
const NSW_T2_BOND: TenancyBondRules = {
  schemeApplies: true,
  maxBondCopy: 'Under NSW law, bond cannot exceed 4 weeks rent.',
  authority: 'NSW Fair Trading',
  authorityUrl: 'https://www.nsw.gov.au/housing-and-construction/renting',
  maxBondMonths: 1,
  lodgementDays: 10,
  lodgementDaysUnit: 'business',
  receiptDays: 15,
  authorityPublicLabel: 'NSW Fair Trading (Rental Bonds Online)',
  landlordAckAuthorityName: null,
}
```

### Does `qld.ts` use the same shape?

**Same shape.** File header states it mirrors NSW; both import `TenancyBondRules` / `TenancyRules` and export `qldTenancyRules(tier: 'T1' | 'T2'): TenancyRules` with the same bond field set. Structural difference is **values** (e.g. QLD T1 has `schemeApplies: true` and RTA URLs; NSW T1 has `schemeApplies: false`), not interface shape.

```1:4:api/lib/tenancy/rules/qld.ts
/**
 * QLD tenancy rules by tier - mirrors nsw.ts export shape.
 * Tier 3 (rooming accommodation) is deferred in resolveTenancyPackage, not defined here (same pattern as vic.ts omitting T3).
 */
```

### Source / statutory reference / effective date fields?

| Kind | Present? | Where |
| --- | --- | --- |
| Source / citation URL | **Partial** | `authorityUrl` (authority homepage URL when scheme on) |
| Authority name / public label | **Yes** | `authority`, `authorityPublicLabel`, `landlordAckAuthorityName` |
| Statutory reference (Act/section field) | **No** typed field | Comments only (e.g. QLD T2 comment: `RTRA Act 2008`) |
| Effective / last-checked / review date | **No** | — |

---

## 3. Embedded assistant: retrieval + guardrail

### Retrieval files

| File | Role |
| --- | --- |
| `api/lib/knowledgeRetrieval.ts` | Embeds query; RPC `match_knowledge_base`; formats chunks |
| `api/chat.ts` | Calls `retrieveRelevantKnowledge`, appends RAG block to system prompt |
| `api/lib/embeddings.ts` | OpenAI embedding helper used by retrieval + seed/admin |
| `supabase/migrations/20260406150000_knowledge_base_rag.sql` | Defines `match_knowledge_base` RPC |
| `src/lib/aiSurfacePromptAssembly.ts` | Holds `CHAT_SYSTEM_PROMPTS` (and helper paths that also append the same RAG block shape) |

Chat wiring (exact):

```582:596:api/chat.ts
  let knowledgeContext = ''
  try {
    knowledgeContext = await retrieveRelevantKnowledge(
      userMessage,
      'NSW', // TODO: detect state from user profile later
      4,
    )
  } catch (e) {
    console.error('[chat] RAG retrieval failed:', e)
  }

  const ragBlock = knowledgeContext
    ? `\n\n--- RELEVANT KNOWLEDGE BASE ---\n${knowledgeContext}\n--- END KNOWLEDGE BASE ---`
    : ''
  const finalSystemPrompt = systemPrompt + ragBlock
```

Chunk formatting injects **title + category + state + content** into the system prompt — not a user-facing citation list:

```17:23:api/lib/knowledgeRetrieval.ts
function formatChunks(rows: MatchRow[]): string {
  const parts: string[] = []
  for (const row of rows) {
    const meta = [row.category, row.state ? row.state : 'national/platform'].filter(Boolean).join(' · ')
    parts.push(`### ${row.title} (${meta})\n${row.content.trim()}`)
  }
  return parts.join('\n\n')
}
```

### System prompt / instruction text

Canonical prompts live in `CHAT_SYSTEM_PROMPTS` in `src/lib/aiSurfacePromptAssembly.ts` (imported into `api/chat.ts` as `SYSTEM_PROMPTS`). Shared rules used by all three personas:

```110:116:src/lib/aiSurfacePromptAssembly.ts
const VERIFICATION_HONESTY_RULE = `- Verification honesty: Only describe user or host verification exactly as stated in this system message or in RELEVANT KNOWLEDGE BASE below. Quni does not verify government IDs for hosts, check property titles, or manually review landlord profiles. Hosts complete Stripe Connect identity verification before accepting bookings; approved hosts may show a "Verified host" badge. Do not invent verification steps not explicitly listed.`

const TRUST_STRIPE_PAYMENTS_RULE = `- Trust & Stripe payments (priority topic): Quni's main trust feature for students is the Verified host badge - landlords must complete Stripe Connect identity verification (Stripe's regulated KYC, not manual Quni review) before they can accept a booking. When Stripe enables charges on their account, the badge appears on listings so renters know the host passed identity checks. Students can still browse, message, and submit booking requests before that step; only acceptance is blocked. Explain why this matters for peace of mind when users ask if a landlord is legitimate, safe, or verified. For payment flows, use RELEVANT KNOWLEDGE BASE articles on student payments, landlord payments, and host verification - do not conflate bond/rent (tenancy money) with Quni platform fees. Students pay no Quni booking/platform/service fees; Listing landlords receive bond/rent directly after accept; Managed landlords use Connect for rent collection and payouts.`

const PRODUCT_INVENTORY_RULE = `- Product capabilities and routes: For "where do I…", "can I…", or whether a feature exists, prefer RELEVANT KNOWLEDGE BASE entries titled "Quni … product features" or "Quni route map" (synced from docs/feature-inventory.md). Do not claim features not listed there. Renters can save properties (heart on cards/detail; Saved tab on the student dashboard). If the knowledge base does not cover the question, suggest the relevant dashboard tab or hello@quni.com.au rather than inventing flows.`

const SAMPLE_AGREEMENTS_RULE = `- Sample agreement PDFs (watermarked, not for signing): Logged-in landlords and students can open the Sample agreements page at /sample-agreements (also linked from the dashboard as "View sample agreements"). It shows clickable thumbnail previews of live-generated templates by state (NSW, QLD, VIC) and tier (T1 occupancy/licence, T2 residential with Quni addendum where applicable). Tell users to use that page - do not say templates are only in listing settings, help centre, or unavailable in chat. You cannot display PDFs inside this chat. Admins reviewing all templates use /admin/agreement-previews. These samples are for layout and wording review only; executed agreements are generated per confirmed booking.`
```

Landlord persona block (full):

```166:185:src/lib/aiSurfacePromptAssembly.ts
  landlord: `You are a helpful assistant on Quni Living, assisting landlords who host students, graduates, and professional renters.

Rules:
1) Be warm, concise, and practical.
2) Address the landlord naturally once using "{{FIRST_NAME}}" if provided.
3) Help landlords complete listing setup by explaining what to include and how to phrase key details to attract the right renters.
4) Explain Stripe Connect and payments clearly: identity verification via Stripe (why students see Verified host), “charges enabled”, Listing saved-card acceptance fee vs Managed rent payouts, and payout timing in general terms (no guarantees). Frame verification as building renter trust, not just a technical hurdle.
5) Explain the non-student tenant opt-in (“open to non-students”) and what it changes for which renters can see/book the listing.
6) Draft replies to renter enquiries: write warm, professional messages and suggest follow-up questions that clarify fit.
7) Understand and reference Verified Student vs Verified Identity badges in guidance: encourage renters to complete the right verification path, and help landlords interpret badge meaning without making assumptions about protected characteristics.
8) Never recommend rejecting based on protected characteristics.
9) Do not invent facts about a renter or a listing. Ask clarifying questions if needed.
10) Prefer actionable checklists and message drafts, but do not output markdown headings or labels.
11) Use Australian English.
12) ${VERIFICATION_HONESTY_RULE.replace(/^- /, '')}
13) ${PRODUCT_INVENTORY_RULE.replace(/^- /, '')}
14) ${SAMPLE_AGREEMENTS_RULE.replace(/^- /, '')}
15) ${TRUST_STRIPE_PAYMENTS_RULE.replace(/^- /, '')}
16) ${NON_DISCRIMINATION_AI_RULE.replace(/^- /, '')}
17) ${NO_EM_DASH_RULE.replace(/^- /, '')}`,
```

(Visitor and student_renter personas are in the same `CHAT_SYSTEM_PROMPTS` object; student_renter additionally hard-binds listing/preference facts. Full visitor + student blocks are in the same file at lines 119–164.)

### Cite sources vs paraphrase? Disclaimer every answer?

- **Cite vs paraphrase:** The assistant **paraphrases from injected chunk text**. There is no prompt instruction to cite URLs, statutes, or knowledge-base titles back to the user. Retrieved chunks have no URL column to cite anyway.
- **`disclaimer` category row:** One seed row exists (`scripts/knowledgeData.json` — title `"Quni AI and legal disclaimer"`, `category: "disclaimer"`). It is **not** specially injected on every turn. It participates in ordinary similarity retrieval like any other row. Grep of `api/` shows no code path that always appends `category === 'disclaimer'`.

Disclaimer seed content (exact):

```json
"title": "Quni AI and legal disclaimer",
"category": "disclaimer",
"state": null,
"content": "Quni AI provides general information only, not legal advice. Laws and policies change, and your situation may differ. For specific legal problems, contact NSW Fair Trading on 13 32 20 or the Tenants’ Union of NSW. For urgent safety issues, contact emergency services."
```

### Guardrail that stops stating a rule it cannot cite?

**None for tenancy / legal rules.** Closest existing guardrails:

- `PRODUCT_INVENTORY_RULE` — do not invent **product features** not in KB; suggest dashboard / email instead.
- `VERIFICATION_HONESTY_RULE` — only describe verification as stated in system message or KB.
- Student listing rule — facts only from LISTING CONTEXT.

There is **no** guardrail of the form “do not state a legal/tenancy rule unless you can cite a source.”

---

## 4. Machine-readability generation — status only

### `llms.txt`

**Hand-authored.** Canonical file: `public/llms.txt`. Build verification (`scripts/verify-prerender-static.mjs`) asserts `dist/llms.txt` exists as a **copy from `public/`**, not generated from a structured rule source. No generator script for `llms.txt` found in the repo.

### FAQPage JSON-LD

**Hand-authored FAQ content → runtime JSON-LD builder** (not generated from a rule map / tenancy rules / knowledge seed).

- Content source for `/faq`: `src/lib/faqContent.tsx` (`FAQ_SECTIONS`; bond answers import constants from `src/lib/bondPublicCopy.ts`).
- Plain pairs: `collectFaqPlainPairs()` in the same file.
- Schema builder: `src/lib/buildFaqPageJsonLd.ts` → `@type: 'FAQPage'`.
- Wired in `src/pages/Faq.tsx`: `buildFaqPageJsonLd(collectFaqPlainPairs())`.
- Pricing and guides reuse the same builder with their own hand-authored FAQ pairs (`Pricing.tsx`, guide `faq.md` / SEO helpers).

**Not** generated from `knowledgeData.json`, `api/lib/tenancy/rules/*`, or any other structured authority map.

*(No expansion of this tranche in this recon.)*

---

## 5. QLD hosted-bond contradiction — confirm and quote

### `src/lib/bondPublicCopy.ts`

```21:26:src/lib/bondPublicCopy.ts
export const BOND_FAQ_HOW_HANDLED =
  'For standard residential tenancies, bond is lodged with your state or territory bond authority. In NSW, bond for hosted rooms (boarder/lodger arrangements) may be held by the landlord. In Queensland, if a bond is taken for a boarder/lodger arrangement it must still be lodged with the RTA within 10 days. Quni does not hold bond money for any tenancy. On Quni Listing, bond is between landlord and renter. On Quni Managed, lodgement may be coordinated where your tenancy requires a statutory scheme.'

/** FAQ - hosted room vs private room bond distinction. */
export const BOND_FAQ_HOSTED_VS_PRIVATE =
  'Hosted rooms are where the owner lives on-site (boarder/lodger-style). In NSW, bond for hosted rooms may be held by the landlord. In Queensland, any bond taken must be lodged with the RTA within 10 days — bond is not compulsory; rent in advance is a lawful alternative. Private rooms are standard residential tenancies where bond (if required) is lodged with your state\'s bond authority under the relevant rules.'
```

### `docs/faq-comprehensive-review.md` (hosted-room bond line)

```119:120:docs/faq-comprehensive-review.md
### What's the difference between a hosted room and a private room?
Hosted rooms are typically where the owner lives on-site (a boarder/lodger-style arrangement) and you sign an occupancy-style agreement; bond (if any) is usually held directly by the landlord. Private rooms are standard residential tenancies where you sign a tenancy agreement and bond (if required) is lodged with your state's bond authority under the relevant rules.
```

### `docs/dual-tier-service-model.md` (Listing bond non-goals line)

```93:96:docs/dual-tier-service-model.md
> **What Quni Listing does NOT include**
> Once your tenant is signed, you run the rest:
> - **Rent collection** - your tenant pays you directly. Quni never touches the money.
> - **Bond** - you lodge it yourself (NSW Fair Trading for private rooms; held by you for hosted rooms).
```

### Still disagree?

**Yes — still disagree.**

| Source | QLD hosted-room bond if taken |
| --- | --- |
| `bondPublicCopy.ts` | **Must be lodged with the RTA** within 10 days |
| `faq-comprehensive-review.md` | Hosted bond “usually held directly by the landlord” — **no QLD RTA exception** |
| `dual-tier-service-model.md` | Hosted rooms: bond “held by you” — **no QLD RTA exception** |

No fix applied in this recon.

---

## Stop

Answers limited to the five questions above. No rule map designed. No pipeline or schema changed.
