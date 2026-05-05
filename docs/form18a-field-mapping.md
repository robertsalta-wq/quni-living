# Form 18a (RTA QLD) — field mapping

Prescribed form: **General tenancy agreement (Form 18a)** under the *Residential Tenancies and Rooming Accommodation Act 2008* (Qld).  
PDF reference: [Form 18a on RTA Queensland](https://www.rta.qld.gov.au/sites/default/files/2021-06/Form-18a-General-tenancy-agreement.pdf) (embedded version **v23 Sep25** in our extraction).

This table maps **RTA Part 1 items** → **platform source** → **default when missing**. Items flagged **GAP** are not captured today; choose whether to add capture, leave blank, or apply a documented default.

| RTA item | Platform / booking field | Default / behaviour when missing |
|----------|--------------------------|----------------------------------|
| **1.1** Lessor name | `landlord_profiles` first/last/full_name + company | — |
| **1.1** Address | `landlord_profiles` address, suburb, state, postcode | `—` |
| **1.1** Postcode | `landlord_profiles.postcode` | `—` |
| **1.2** Phone, mobile, ABN, email | `landlord_profiles.phone`, `.email` | **GAP**: ABN not stored — omitted |
| **2.1 (1)** Tenant | `student_profiles` name, phone, email | — |
| **2.1 (1)** Emergency contact | `student_profiles.emergency_contact_*` | `—` |
| **2.1 (2)(3)** Co-tenants | — | **GAP**: not populated — empty rows |
| **2.2** Address for service | Optional tenant address | Same as premises |
| **3** Agent | — | **Not applicable** (no agent row in generator) |
| **4** Notices email/text/fax | Consent inferred | Email Yes when addresses present |
| **5.1** Premises address | `properties` address, suburb, state, postcode | — |
| **5.2** Inclusions | Room type + furnished flag | Descriptive line from listing fields |
| **5.3** Repair orders | — | **GAP**: shown as “None stated” |
| **6** Term fixed / periodic | `bookings.lease_length`, dates | Derived fixed vs periodic |
| **6.2–6.3** Start / end | `move_in_date`, `end_date` / computed end | — |
| **7** Rent amount & frequency | `weekly_rent` | Weekly only in handler |
| **8** Rent due day | Derived weekday from start date | Monday fallback |
| **9** Payment methods / BSB | `platform_config` bank details + payment line | Bank block when configured |
| **10** Place of payment | — | “As agreed — electronic transfer” |
| **11** Last rent increase | — | **GAP**: “Not stated — new tenancy / unknown” |
| **12** Bond | `properties.bond` or 4× weekly rent | — |
| **13–15** Services / water / apportionment | Listing + addendum | Summary points to Quni QLD addendum |
| **16** Max occupants | `housemates_count + 1` | — |
| **17** Body corporate | — | No / N/A |
| **18** Nominated repairers | Landlord phone | Same contact for electrical / plumbing |
| **18.2** First point of contact | — | Yes — lessor details |
| **19** Pets | — | “None unless agreed in writing” |

**Routing:** `resolveTenancyPackage` generator `qld-form18a` → `/api/documents/generate-qld-residential-tenancy`.  
**Storage basenames:** `qld_form18a_general_tenancy_agreement_draft.pdf` / `_signed.pdf` under `{tenancy_id}/residential_tenancy/`.
