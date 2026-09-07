# QLD Form R18 v15 field map

**Form:** RTA Form R18 Rooming accommodation agreement
**Version:** v15 Sep25
**Source file:** `form-r18-v15.pdf`
**SHA-256:** `ccefc68df8c65804daa40c6bff8dcd9f30e4759e19a9cfe3cff8b3cff87be808`
**Pages:** 11
**Fill module:** `api/lib/documents/officialQldFormR18Fill.ts`
**AcroForm names:** `api/lib/documents/qldFormR18Fields.ts`

Official `/T` names are used as-is, including RTA typos (`Emengency`, `facsimilie`). Agent email No is `No6`, not `No5`.

Action buttons `Reset form` and `Print form` are dropped before flatten.

## Quni fill

| Item | Behaviour | AcroForm |
|---|---|---|
| 1 Provider | Listing host profile | `Agent or manager/provider name/trading name`, address, phone, email, ABN |
| 2 Resident 1 | Student profile. Emergency contact snapshot includes email. Resident 2 left empty. | `Resident 1 full name/s`, phone, email, `Emengency contact *1` |
| 2.2 Address for service | Left blank. Clause 36(4) makes the premises the address for service. | `Address` fields for resident not filled |
| 3 Agent | Always blank. Quni is not the provider's agent. | `Manager/provider’s agent name/trading name2` and related |
| 4 Representative | Always blank | representative name/address/notice fields |
| 5 Notices | From `qld_notice_consent_events`. Email and SMS only. Fax always No. Agent and representative always No. | Yes/No `Yes1`/`No1` (provider email) through `Yes11`/`No11`. Provider email No is `No1`. Agent email No is `No6`. |
| 6.1 Room | `properties.room_description`. Tiny widget; font shrinks to fit. No `qld_room_number` column. | `Room number`, `Inclusions provided` |
| 6 Level | Level 1 hardcoded | `Level 1` |
| 7 Student accommodation | `properties.qld_student_accommodation` | `Student accommodation` |
| 8 Term | Booking dates | `Fixed term agreement` / `Periodic agreement`, start/end |
| 9 Rent | Accommodation only, weekly | `Rent amount`, `Accommodation`, `Weekly` |
| 11 Methods | Method 1 Direct credit. Method 2 plus s 99B costs and clause 7(5) benefit from listing columns. Bank block from `property_payout_details` including `bank_name`. | `Method 1`, `Method 2`, `Bank/building society/credit union`, account name, BSB, account number, payment reference |
| 13.2 Last increase | `qld_rent_last_increased_on`. Blank means never increased. Do not invent can-increase. | `The day the rent was last increased for the room (dd/mm/yyyy)`. `Yes12`/`No12` left unchecked |
| 14 Bond | Listing bond amount | `Rental bond amount` |
| 15 Service | Level 1 hardcoded. No food. | `Level 1a` |
| 16 Persons | Occupant count and `qld_persons_at_premises` | person-count fields |
| 17 House rules | Yes only with `bookings.qld_house_rules_attested_at`. Sample uses a fixture. | `Yes13` / `No13` |
| 18 Pets | Left blank | pet fields |
| 19 By-laws | Not applicable, copy No (same as 18a) | `Yes14`/`No14`, `Yes15`/`No15` |
| 20 Guardianship / POA | Left unchecked. A real guardian is a different signer. | no dedicated fill |
| Part 3 | Locked `QLD_FORM_R18_PART3_SPECIAL_TERMS`. Overflow throws. No shrink, no truncate. | `Special terms` |

Part 2 standard terms are not filled. They are the official form text.
