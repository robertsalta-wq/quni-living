# Queensland classification rule

**Status:** Canonical. Cite this file. Do not restate the test in code comments, tests, briefs, or product copy.

**Statute:** Residential Tenancies and Rooming Accommodation Act 2008 (Qld) (RTRA Act).

**Verified:** RTA guidance, 4 Sep 2026.

**Instrument by outcome:**

| Outcome | Prescribed form / Quni document |
|---|---|
| General tenancy under the Act | Form 18a |
| Rooming accommodation under the Act | Form R18 |
| Outside the Act | No prescribed form. Quni Occupancy Agreement. |

This file states the **legal test**. It does not say what Quni currently generates. For the live router vs this rule, see `docs/qld-rule-reconciliation.md`.

---

## Inputs

1. **What is let:** the whole premises or a self-contained unit, versus one or more rooms with facilities shared with other residents.
2. **Whether the provider (or their agent) lives at the premises.**
3. **How many rooms at the premises are occupied by, or available for occupation by, residents.**

The count is rooms let or available to residents. It is not bedrooms in the house. It does not include the provider's own room.

"4 or more bedrooms" is not the test.

---

## The test

- **Whole premises or self-contained unit** → **general tenancy**. Nothing else matters.
- **One or more rooms with shared facilities:**
  - Provider does **not** live at the premises → **rooming accommodation**, at any number of rooms. One room is enough.
  - Provider **does** live at the premises:
    - **3 or fewer** rooms occupied by or available to residents → **outside the Act** (s 43).
    - **4 or more** → **rooming accommodation**.

The room-count threshold exists only inside the live-in branch. Where the provider lives off site, room count is irrelevant.

---

## What does not affect the test

**Registration.** There is no registration concept in the Queensland rooming accommodation test. Registration under the Residential Services (Accreditation) Act 2002 is a separate regime on a separate axis. It does not make an arrangement rooming accommodation, and it does not stop it being so.

**Service level.** Level 1 (accommodation only), Level 2 (plus food service), and Level 3 (plus personal care) are recorded on Form R18 at items 6 and 15. They describe what is provided. They do not determine whether the arrangement is rooming accommodation. Whether Quni supports a level is a product decision, not part of this test. Do not make level a routing input.

---

## Opt-in (known path; Quni does not offer it)

A provider and resident may agree that the general tenancy provisions apply instead, in which case the arrangement uses Form 18a. That is a real statutory election. It requires both parties to actually agree, and it must be evidenced.

**Quni does not offer this election and must not imply it.** Record it here so later work does not treat a landlord checkbox, a listing card, or silence as an opt-in.

---

## Coverage exclusions that matter on a student platform

Excluded from rooming accommodation coverage (not an exhaustive list of the Act):

- Accommodation for students **within the external boundaries of a university campus**, provided by the university or by a not-for-profit such as a college.
- Aged care, retirement villages, private hospitals, mental health services, holiday and tourist accommodation, school boarding houses.

**Off-campus student accommodation is not excluded.** It is ordinary rooming accommodation when the test above says so.

Nearest-campus fields used for search (`university_id`, `campus_id`) are not this exclusion.

---

## How to cite

In code, tests, briefs, and copy, point here:

`docs/legal/qld-classification-rule.md`

Do not paraphrase the test into a shorter "4 rooms" or "off-site = 18a" line. If product copy needs a sentence, quote or tightly follow the live-in branch or the off-site branch as written above, and keep the precondition.
