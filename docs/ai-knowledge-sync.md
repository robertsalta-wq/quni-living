# Keeping Quni AI in sync with the product

The in-app AI assistant (floating widget and `/landlords/ai`) does **not** automatically read every file in the repo. It learns from a few deliberate layers. When you ship a new feature users might ask about, update the relevant layer(s) below.

## 1. System prompts (always-on behaviour)

**File:** `api/chat.ts` — `SYSTEM_PROMPTS` for `visitor`, `student_renter`, and `landlord`.

These rules apply to every chat turn for that persona (verification honesty, sample agreement URLs, tone, etc.). Changes here take effect on the next API deploy — no database step.

Other AI endpoints have their own prompts and are **not** updated automatically:

| Endpoint | File | Purpose |
|----------|------|---------|
| Landlord applicant assessment | `api/ai/student-assessment.ts` | Booking review AI panel |
| Enquiry reply draft | `api/ai/draft-enquiry-reply.ts` | Draft message to renter |
| Pricing suggest | `api/ai/suggest-pricing.ts` | Listing rent suggestions |

## 2. Knowledge base RAG (Q&A facts)

**Seed file:** `scripts/knowledgeData.json`  
**Runtime store:** Supabase `knowledge_base` (vector search via `api/lib/knowledgeRetrieval.ts`)  
**Admin UI:** Admin → Knowledge base (`/admin/knowledge-base`)

Each chat message embeds the user question and retrieves the top matching chunks (similarity ≥ 0.7). Good for tenancy law, platform fees, verification policy, and “where do I click?” style answers.

**After editing `knowledgeData.json` or adding rows in admin:**

```bash
node scripts/run-with-env.mjs npx tsx scripts/seedKnowledge.ts
```

Re-seed whenever you add or materially change entries. Admin UI saves re-embed automatically on create/update.

**Tips for good entries:**

- Use titles and content that match how users ask (“sample agreement”, “template”, “preview lease”).
- Set `category` to `platform_policy` for product flows, `tenancy_law` for state law, `disclaimer` for legal limits.
- Use `state: "NSW"` (etc.) only when the chunk is state-specific; use `null` for national/platform topics.

## 3. Persona-specific context (not RAG)

| Persona | Extra context |
|---------|-------------|
| `student_renter` | Live listing rows from Supabase (`buildStudentListingContextBlock` in `api/chat.ts`) |
| `landlord` | First name from profile only |
| `visitor` | No listing context; general guidance only |

Listing facts only appear for logged-in students/renters with listing data loaded in the chat widget.

## 4. Prompt chips (suggested questions)

**File:** `src/components/aiChat/ChatPromptChips.tsx`

Update when you want one-click suggestions to reflect new features.

## 5. What the AI cannot know

- Private booking or agreement PDFs for a specific tenancy (until signed URLs exist in product UI).
- Unreleased features not described in prompts or knowledge base.
- Admin-only tools unless mentioned in knowledge or prompts.

## Checklist when shipping a user-visible feature

1. Would users ask the chat about it? → Add or update a `knowledgeData.json` entry + re-seed.
2. Should the assistant always mention a URL or rule? → Add to `SYSTEM_PROMPTS` in `api/chat.ts`.
3. Is it persona-specific behaviour? → Update the right persona block only.
4. Optional: add a prompt chip in `ChatPromptChips.tsx`.
5. Deploy API + frontend; run `seedKnowledge` if knowledge JSON changed.

## Related: agreement sample PDFs

| Audience | Route |
|----------|--------|
| Landlord / student | `/sample-agreements` |
| Admin (full matrix) | `/admin/agreement-previews` |
| Regenerate PDFs | `npm run generate:agreement-samples` |
