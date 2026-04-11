// src/lib/documents/NswResidentialTenancyAgreement.tsx
import { existsSync } from "node:fs";
import { join } from "node:path";
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

// src/lib/documents/ft6600EmbeddedStrings.ts
var FT6600_TITLE_AND_IMPORTANT = `NSW FAIR TRADING \u2014 RESIDENTIAL TENANCY AGREEMENT
Form FT6600 \u2014 Updated 17 December 2025
Standard form from 19 May 2025
Residential Tenancies Regulation 2019 Schedule 1 Standard Form Agreement (Clause 4(1))

========================================
IMPORTANT INFORMATION
========================================

Please read this before completing the residential tenancy agreement (the Agreement).

1. This form is your written record of your tenancy agreement. This is a binding contract under the Residential Tenancies Act 2010, so please read all terms and conditions carefully.

2. If you need advice or information on your rights and responsibilities, please call NSW Fair Trading on 13 32 20 or visit nsw.gov.au/fair-trading before signing the Agreement.

3. If you require extra space to list additional items and terms, attach a separate sheet. All attachments should be signed and dated by both the landlord or the landlord's agent and the tenant to show that both parties have read and agree to the attachments.

4. The landlord or the landlord's agent must give the tenant a copy of the signed Agreement and any attachments, two copies or one electronic copy of the completed condition report and a copy of the Tenant Information Statement published by NSW Fair Trading.`;
var FT6600_CLAUSES_1_TO_55 = `RIGHT TO OCCUPY THE PREMISES

1. The landlord agrees that the tenant has the right to occupy the residential premises during the tenancy. The residential premises include the additional things (if any) noted under 'Residential premises' on page 3 of this agreement.

COPY OF AGREEMENT

2. The landlord agrees to give the tenant:
2.1 a copy of this agreement before or when the tenant gives the signed copy of the agreement to the landlord or landlord's agent, and
2.2 a copy of this agreement signed by both the landlord and the tenant as soon as is reasonably practicable.

RENT

3. The tenant agrees:
3.1 to pay rent on time, and
3.2 to reimburse the landlord for the cost of replacing rent deposit books or rent cards lost by the tenant, and
3.3 to reimburse the landlord for the amount of any fees paid by the landlord to a bank or other authorised deposit-taking institution as a result of funds of the tenant not being available for rent payment on the due date, and
3.4 that the rent payment method may only be changed by agreement between the landlord and the tenant.

4. The landlord agrees:
4.1 to not require the tenant to pay more than 2 weeks rent in advance or to pay rent for a payment period before the end of the previous payment period, and
4.2 to offer the tenant the option to pay rent by an approved electronic bank transfer method or by Centrepay and, if chosen by the tenant, to enable payment by that method, and
4.3 to not charge fees or pass on costs incurred for the payment of rent by an approved electronic bank transfer method or by Centrepay, and
4.4 that the rent payment method may only be changed by agreement between the landlord and the tenant, and the landlord will not refuse if the tenant requests to change to an approved electronic bank transfer method or to Centrepay, and
4.5 to not require the tenant to pay rent by a cheque or other negotiable instrument that is post-dated, and
4.6 to accept payment of unpaid rent after the landlord has given a termination notice on the ground of failure to pay rent if the tenant has not vacated the residential premises, and
4.7 to not use rent paid by the tenant for the purpose of any amount payable by the tenant other than rent, and
4.8 if rent is paid by cheque \u2013 to make a rent receipt available for collection by the tenant, to post it to the residential premises or to send it by email to an email address specified in this agreement by the tenant for the service of documents of that kind, and
4.9 if rent is not paid by cheque and is paid in person \u2013 to give a rent receipt to the tenant, and
4.10 to keep a record of rent paid under this agreement and to provide a written statement showing the rent record for a specified period within 7 days of a request by the tenant, unless the landlord has previously provided a statement for the same period.

Note: The requirements relating to Centrepay do not apply to a residential tenancy agreement until a date notified in the Gazette by the Minister for Better Regulation and Fair Trading.

RENT INCREASES

5. The landlord and the tenant agree that the rent cannot be increased unless the landlord gives not less than 60 days written notice of the increase to the tenant. The notice must specify the increased rent and the day from which it is payable.

6. The landlord and the tenant agree that the rent may not be increased more than once in any 12-month period.

Note: The period of 12 months includes the time during which a previous residential tenancy agreement was in force if \u2013
(a) this agreement is a renewal or replacement of the previous agreement, and
(b) the landlord and at least one tenant are the same for both agreements, and
(c) under the previous agreement, the tenant occupied the residential premises immediately before the start of this agreement.

7. The landlord and the tenant agree:
7.1 that the increased rent is payable from the day specified in the notice, and
7.2 that the landlord may cancel or reduce the rent increase by a later notice that takes effect on the same day as the original notice, and
7.3 that increased rent under this agreement is not payable unless the rent is increased in accordance with this agreement and the Residential Tenancies Act 2010 or by the Civil and Administrative Tribunal.

RENT REDUCTIONS

8. The landlord and the tenant agree that the rent abates if the residential premises:
8.1 are destroyed, or become wholly or partly uninhabitable, otherwise than as a result of a breach of this agreement, or
8.2 cease to be lawfully usable as a residence, or
8.3 are compulsorily appropriated or acquired by an authority.

9. The landlord and the tenant may, at any time during this agreement, agree to reduce the rent payable.

PAYMENT OF COUNCIL RATES, LAND TAX, WATER AND OTHER CHARGES

10. The landlord agrees to pay:
10.1 rates, taxes or charges payable under any Act (other than charges payable by the tenant under this agreement), and
10.2 the installation costs and charges for initial connection to the residential premises of an electricity, water, gas, bottled gas or oil supply service, and
10.3 all charges for the supply of electricity, non-bottled gas or oil to the tenant at the residential premises that are not separately metered, and

Note 1: Clause 10.3 does not apply to premises located in an embedded network in certain circumstances in accordance with clauses 34 and 35 of the Residential Tenancies Regulation 2019.
Note 2: Clause 10.3 does not apply to social housing tenancy agreements in certain circumstances, in accordance with clause 36 of the Residential Tenancies Regulation 2019.

10.4 the costs and charges for the supply or hire of gas bottles for the supply of bottled gas at the commencement of the tenancy, and
10.5 all charges (other than water usage charges) in connection with a water supply service to separately metered residential premises, and
10.6 all charges in connection with a water supply service to residential premises that are not separately metered, and
10.7 all charges for the supply of sewerage services (other than for pump out septic services) or the supply or use of drainage services to the residential premises, and
10.8 all service availability charges, however described, for the supply of non-bottled gas to the residential premises if the premises are separately metered but do not have any appliances, supplied by the landlord, for which gas is required and the tenant does not use gas supplied to the premises, and
10.9 the costs and charges for repair, maintenance or other work carried out on the residential premises which is required to facilitate the proper installation or replacement of an electricity meter, in working order, including an advance meter, if the meter installation is required by the retailer to replace an existing meter because the meter is faulty, testing indicates the meter may become faulty or the meter has reached the end of its life.

11. The tenant agrees to pay:
11.1 all charges for the supply of electricity or oil to the tenant at the residential premises if the premises are separately metered, and
11.2 all charges for the supply of non-bottled gas to the tenant at the residential premises if the premises are separately metered, unless the premises do not have any appliances supplied by the landlord for which gas is required and the tenant does not use gas supplied to the premises, and

Note: Charges for the supply of gas in certain circumstances may also be payable by a tenant under a social housing agreement in accordance with clause 36 of the Residential Tenancies Regulation 2019.

11.3 all charges for the supply of bottled gas to the tenant at the residential premises except for the costs and charges for the supply or hire of gas bottles at the start of the tenancy, and
11.4 all charges for pumping out a septic system used for the residential premises, and
11.5 any excess garbage charges relating to the tenant's use of the residential premises, and
11.6 water usage charges, if the landlord has installed water efficiency measures referred to in clause 10 of the Residential Tenancies Regulation 2019 and the residential premises:
11.6.1 are separately metered, or
11.6.2 are not connected to a water supply service and water is delivered by vehicle.

Note: Separately metered is defined in section 3 of the Residential Tenancies Act 2010.

12. The landlord agrees that the tenant is not required to pay water usage charges unless:
12.1 the landlord gives the tenant a copy of the part of the water supply authority's bill setting out the charges, or other evidence of the cost of water used by the tenant, and
12.2 the landlord gives the tenant at least 21 days to pay the charges, and
12.3 the landlord requests payment of the charges by the tenant not later than 3 months after the issue of the bill for the charges by the water supply authority, and
12.4 the residential premises have the following water efficiency measures:
12.4.1 all internal cold water taps and single mixer taps for kitchen sinks or bathroom hand basins on the premises have a maximum flow rate of 9 litres a minute,
12.4.2 all toilets are dual flush toilets that have a minimum 3 star rating in accordance with the WELS scheme,
12.4.3 all showerheads have a maximum flow rate of 9 litres a minute, and
12.4.4 at the commencement of the residential tenancy agreement and whenever any other water efficiency measures are installed, repaired or upgraded, the premises are checked and any leaking taps or toilets on the premises have been fixed.

13. The landlord agrees to give the tenant the benefit of, or an amount equivalent to, any rebate received by the landlord for water usage charges payable or paid by the tenant.

POSSESSION OF THE PREMISES

14. The landlord agrees:
14.1 to make sure that the residential premises are vacant so the tenant can move in on the date agreed, and
14.2 to take all reasonable steps to ensure that, at the time of signing this agreement, there is no legal reason why the premises cannot be used as a residence for the term of this agreement.

TENANT'S RIGHT TO QUIET ENJOYMENT

15. The landlord agrees:
15.1 that the tenant will have quiet enjoyment of the residential premises without interruption by the landlord or any person claiming by, through or under the landlord or having superior title to that of the landlord (such as a head landlord), and
15.2 that the landlord or the landlord's agent will not interfere with, or cause or permit any interference with, the reasonable peace, comfort or privacy of the tenant in using the residential premises, and
15.3 that the landlord or the landlord's agent will take all reasonable steps to ensure that the landlord's other neighbouring tenants do not interfere with the reasonable peace, comfort or privacy of the tenant in using the residential premises.

USE OF THE PREMISES BY TENANT

16. The tenant agrees:
16.1 not to use the residential premises, or cause or permit the premises to be used, for any illegal purpose, and
16.2 not to cause or permit a nuisance, and
16.3 not to interfere, or cause or permit interference, with the reasonable peace, comfort or privacy of neighbours, and
16.4 not to intentionally or negligently cause or permit any damage to the residential premises, and
16.5 not to cause or permit more people to reside in the residential premises than is permitted by this agreement.

17. The tenant agrees:
17.1 to keep the residential premises reasonably clean, and
17.2 to notify the landlord as soon as practicable of any damage to the residential premises, and
17.3 that the tenant is responsible to the landlord for any act or omission by a person who is lawfully on the residential premises if the person is only permitted on the premises with the tenant's consent and the act or omission would be in breach of this agreement if done or omitted by the tenant, and
17.4 that it is the tenant's responsibility to replace light globes on the residential premises.

18. The tenant agrees, when this agreement ends and before giving vacant possession of the premises to the landlord:
18.1 to remove all the tenant's goods from the residential premises, and
18.2 to leave the residential premises as nearly as possible in the same condition, fair wear and tear excepted, as at the commencement of the tenancy, and
18.3 to leave the residential premises reasonably clean, having regard to its condition at the commencement of the tenancy, and
18.4 to remove or arrange for the removal of all rubbish from the residential premises in a way that is lawful and in accordance with council requirements, and
18.5 to make sure that all light fittings on the premises have working globes, and
18.6 to return to the landlord all keys, and other opening devices or similar devices, provided by the landlord.

Note: Under section 54 of the Residential Tenancies Act 2010, the vicarious liability of a tenant for damage to residential premises caused by another person is not imposed on a tenant who is the victim of a domestic violence offence, or a co-tenant who is not a relevant domestic violence offender, if the damage occurred during the commission of a domestic violence offence (within the meaning of that Act).

LANDLORD'S GENERAL OBLIGATIONS FOR RESIDENTIAL PREMISES

19. The landlord agrees:
19.1 to make sure that the residential premises are reasonably clean and fit to live in, and

Note 1: Section 52 of the Residential Tenancies Act 2010 specifies the minimum requirements that must be met for the residential premises to be fit to live in. These include that the residential premises:
a) are structurally sound, and
b) have adequate natural light or artificial lighting in each room of the premises other than a room that is intended to be used only for the purposes of storage or a garage, and
c) have adequate ventilation, and
d) are supplied with electricity or gas and have an adequate number of electricity outlet sockets or gas outlet sockets for the supply of lighting and heating to, and use of appliances in, the premises, and
e) have adequate plumbing and drainage, and
f) are connected to a water supply service or infrastructure that supplies water (including, but not limited to, a water bore or water tank) that is able to supply to the premises hot and cold water for drinking and ablution and cleaning activities, and
g) contain bathroom facilities, including toilet and washing facilities, that allow privacy for the user.

Note 2: Premises are structurally sound only if the floors, ceilings, walls, supporting structures (including foundations), doors, windows, roof, stairs, balconies, balustrades and railings:
a) are in a reasonable state of repair, and
b) with respect to the floors, ceilings, walls and supporting structures \u2013 are not subject to significant dampness, and
c) with respect to the roof, ceilings and windows \u2013 do not allow water penetration into the premises, and
d) are not liable to collapse because they are rotted or otherwise defective.

19.2 to make sure that all light fittings on the residential premises have working light globes on the commencement of the tenancy, and
19.3 to keep the residential premises in a reasonable state of repair, considering the age of, the rent paid for and the prospective life of the premises, and
19.4 not to interfere with the supply of gas, electricity, water, telecommunications or other services to the residential premises (unless the interference is necessary to avoid danger to any person or enable maintenance or repairs to be carried out), and
19.5 not to hinder a tradesperson's entry to the residential premises when the tradesperson is carrying out maintenance or repairs necessary to avoid health or safety risks to any person, or to avoid a risk that the supply of gas, electricity, water, telecommunications or other services to the residential premises may be disconnected, and
19.6 to comply with all statutory obligations relating to the health or safety of the residential premises, and
19.7 that a tenant who is the victim of a domestic violence offence or a co-tenant who is under the same agreement as the victim of the domestic violence offence but is not a relevant domestic violence offender is not responsible to the landlord for any act or omission by a co-tenant that is a breach of this agreement if the act or omission constitutes or resulted in damage to the premises and occurred during the commission of a domestic violence offence.

URGENT REPAIRS

20. The landlord agrees to pay the tenant, within 14 days after receiving written notice from the tenant, any reasonable costs (not exceeding $1,000) that the tenant has incurred for making urgent repairs to the residential premises (of the type set out below) so long as:
20.1 the damage was not caused as a result of a breach of this agreement by the tenant, and
20.2 the tenant gives or makes a reasonable attempt to give the landlord notice of the damage, and
20.3 the tenant gives the landlord a reasonable opportunity to make the repairs, and
20.4 the tenant makes a reasonable attempt to have any appropriate tradesperson named in this agreement make the repairs, and
20.5 the repairs are carried out, where appropriate, by licensed or properly qualified persons, and
20.6 the tenant, as soon as possible, gives or tries to give the landlord written details of the repairs, including the cost and the receipts for anything the tenant pays for.

Note: The type of repairs that are urgent repairs are defined in the Residential Tenancies Act 2010 and are defined as follows:
(a) a burst water service,
(b) an appliance, fitting or fixture that uses water or is used to supply water that is broken or not functioning properly, so that a substantial amount of water is being wasted,
(c) a blocked or broken lavatory system,
(d) a serious roof leak,
(e) a gas leak,
(f) a dangerous electrical fault,
(g) flooding or serious flood damage,
(h) serious storm or fire damage,
(i) a failure or breakdown of the gas, electricity or water supply to the premises,
(j) a failure or breakdown of any essential service on the residential premises for hot water, cooking, heating, cooling or laundering,
(k) any fault or damage that causes the premises to be unsafe or insecure.

SALE OF THE PREMISES

21. The landlord agrees:
21.1 to give the tenant written notice that the landlord intends to sell the residential premises, at least 14 days before the premises are made available for inspection by potential purchasers, and
21.2 to make all reasonable efforts to agree with the tenant as to the days and times when the residential premises are to be available for inspection by potential purchasers.

22. The tenant agrees not to unreasonably refuse to agree to days and times when the residential premises are to be available for inspection by potential purchasers.

23. The landlord and the tenant agree:
23.1 that the tenant is not required to agree to the residential premises being available for inspection more than twice in a period of a week, and
23.2 that, if they fail to agree, the landlord may show the residential premises to potential purchasers not more than twice in any period of a week and must give the tenant at least 48 hours notice each time.

LANDLORD'S ACCESS TO THE PREMISES

24. The landlord agrees that the landlord, the landlord's agent or any person authorised in writing by the landlord, during the currency of this agreement, may only enter the residential premises in the following circumstances:
24.1 in an emergency (including entry for the purpose of carrying out urgent repairs),
24.2 if the Civil and Administrative Tribunal so orders,
24.3 if there is good reason for the landlord to believe the premises are abandoned,
24.4 if there is good reason for serious concern about the health of the tenant or any other person on the residential premises and a reasonable attempt has been made to obtain consent to the entry,
24.5 to inspect the premises, if the tenant is given at least 7 days written notice (no more than 4 inspections are allowed in any period of 12 months),
24.6 to carry out, or assess the need for, necessary repairs, if the tenant is given at least 2 days notice each time,
24.7 to carry out, or assess the need for, work relating to statutory health and safety obligations relating to the residential premises, if the tenant is given at least 2 days notice each time,
24.8 to show the premises to prospective tenants on a reasonable number of occasions if the tenant is given reasonable notice on each occasion (this is only allowed during the last 14 days of the agreement),
24.9 to value the property, if the tenant is given 7 days notice (not more than one valuation is allowed in any period of 12 months),
24.10 to take photographs, or make visual recordings, of the inside of the premises in order to advertise the premises for sale or lease, if the tenant is given reasonable notice and reasonable opportunity to move any of their possessions that can reasonably be moved out of the frame of the photograph or the scope of the recording (this is only allowed once in a 28 day period before marketing of the premises starts for sale or lease or the termination of this agreement),
24.11 if the tenant agrees.

25. The landlord agrees that a person who enters the residential premises under clause 24.5, 24.6, 24.7, 24.8, 24.9 or 24.10 of this agreement:
25.1 must not enter the premises on a Sunday or a public holiday, unless the tenant agrees, and
25.2 may enter the premises only between the hours of 8.00 a.m. and 8.00 p.m., unless the tenant agrees to another time, and
25.3 must not stay on the residential premises longer than is necessary to achieve the purpose of the entry to the premises, and
25.4 must, if practicable, notify the tenant of the proposed day and time of entry.

26. The landlord agrees that, except in an emergency (including to carry out urgent repairs), a person other than the landlord or the landlord's agent must produce to the tenant the landlord's or the landlord's agent's written permission to enter the residential premises.

27. The tenant agrees to give access to the residential premises to the landlord, the landlord's agent or any person, if they are exercising a right to enter the residential premises in accordance with this agreement.

PUBLISHING PHOTOGRAPHS OR VISUAL RECORDINGS

28. The landlord agrees that the landlord or the landlord's agent must not publish any photographs taken or visual recordings made of the inside of the residential premises in which the tenant's possessions are visible unless they first obtain written consent from the tenant.

Note: See section 55A of the Residential Tenancies Act 2010 for when a photograph or visual recording is 'published'.

29. The tenant agrees not to unreasonably withhold consent. If the tenant is in circumstances of domestic violence within the meaning of section 105B of the Residential Tenancies Act 2010, it is not unreasonable for the tenant to withhold consent.

FIXTURES, ALTERATIONS, ADDITIONS OR RENOVATIONS TO THE PREMISES

30. The tenant agrees:
30.1 not to install any fixture or renovate, alter or add to the residential premises without the landlord's written permission, and
30.2 that certain kinds of fixtures or alterations, additions or renovations that are of a minor nature specified by clause 22(2) of the Residential Tenancies Regulation 2019 may only be carried out by a person appropriately qualified to install those fixtures or carry out those alterations, additions or renovations unless the landlord gives consent, and
30.3 to pay the cost of a fixture, installed by or on behalf of the tenant, or any renovation, alteration or addition to the residential premises, unless the landlord otherwise agrees, and
30.4 not to remove, without the landlord's permission, any fixture attached by the tenant that was paid for by the landlord or for which the landlord gave the tenant a benefit equivalent to the cost of the fixture, and
30.5 to notify the landlord of any damage caused by removing any fixture attached by the tenant, and
30.6 to repair any damage caused by removing the fixture or compensate the landlord for the reasonable cost of repair.

31. The landlord agrees not to unreasonably withhold consent to a fixture, or to an alteration, addition or renovation that is of a minor nature.

Note: The Residential Tenancies Regulation 2019 provides a list of the kinds of fixtures or alterations, additions or renovations of a minor nature to which it would be unreasonable for a landlord to withhold consent and which of those fixtures, or alterations, additions or renovations the landlord may give consent to on the condition that the fixture or alteration, addition or renovation is carried out by an appropriately qualified person.

LOCKS AND SECURITY DEVICES

32. The landlord agrees:
32.1 to provide and maintain locks or other security devices necessary to keep the residential premises reasonably secure, and
32.2 to give each tenant under this agreement a copy of the key or opening device or information to open any lock or security device for the residential premises or common property to which the tenant is entitled to have access, and
32.3 not to charge the tenant for the cost of providing the copies except to recover the cost of replacement or additional copies, and
32.4 not to alter, remove or add any lock or other security device without reasonable excuse (which includes an emergency, an order of the Civil and Administrative Tribunal, termination of a co-tenancy or an apprehended violence order prohibiting a tenant or occupant from having access) or unless the tenant agrees, and
32.5 to give each tenant under this agreement a copy of any key or other opening device or information to open any lock or security device that the landlord changes as soon as practicable (and no later than 7 days) after the change.

33. The tenant agrees:
33.1 not to alter, remove or add any lock or other security device without reasonable excuse (which includes an emergency, an order of the Civil and Administrative Tribunal, termination of a co-tenancy or an apprehended violence order prohibiting a tenant or occupant from having access) or unless the landlord agrees, and
33.2 to give the landlord a copy of the key or opening device or information to open any lock or security device that the tenant changes within 7 days of the change.

34. A copy of a changed key or other opening device need not be given to the other party if the other party agrees not to be given a copy or the Civil and Administrative Tribunal authorises a copy not to be given or the other party is prohibited from access to the residential premises by an apprehended violence order.

TRANSFER OF TENANCY OR SUB-LETTING BY TENANT

35. The landlord and the tenant agree that:
35.1 the tenant may, with the landlord's written permission, transfer the tenant's tenancy under this agreement or sub-let the residential premises, and
35.2 the landlord may refuse permission (whether or not it is reasonable to do so) to the transfer of the whole of the tenancy or sub-letting the whole of the residential premises, and
35.3 the landlord must not unreasonably refuse permission to a transfer of part of a tenancy or a sub-letting of part of the residential premises, and
35.4 without limiting clause 35.3, the landlord may refuse permission to a transfer of part of the tenancy or to sub-letting part of the residential premises if the number of occupants would be more than is permitted under this agreement or any proposed tenant or sub-tenant is listed on a residential tenancy database or it would result in overcrowding of the residential premises.

Note: Clauses 35.3 and 35.4 do not apply to social housing tenancy agreements.

36. The landlord agrees not to charge for giving permission other than for the landlord's reasonable expenses in giving permission.

CHANGE IN DETAILS OF LANDLORD OR LANDLORD'S AGENT

37. The landlord agrees:
37.1 if the name and telephone number or contact details of the landlord change, to give the tenant notice in writing of the change within 14 days, and
37.2 if the address of the landlord changes (and the landlord does not have an agent), to give the tenant notice in writing of the change within 14 days, and
37.3 if the name, telephone number or business address of the landlord's agent changes or the landlord appoints an agent, to give the tenant notice in writing of the change or the agent's name, telephone number and business address, as appropriate, within 14 days, and
37.4 if the landlord or landlord's agent is a corporation and the name or business address of the corporation changes, to give the tenant notice in writing of the change within 14 days, and
37.5 if the State, Territory or country in which the landlord ordinarily resides changes, to give the tenant notice in writing of the change within 14 days.

COPY OF CERTAIN BY-LAWS TO BE PROVIDED

38. The landlord agrees to give to the tenant, before the tenant enters into this agreement, a copy of the by-laws applying to the residential premises if they are premises under the Strata Schemes Management Act 2015.

39. The landlord agrees to give to the tenant, within 7 days of entering into this agreement, a copy of the by-laws applying to the residential premises if they are premises under the Strata Schemes Development Act 2015, the Community Land Development Act 2021 or the Community Land Management Act 2021.

MITIGATION OF LOSS

40. The rules of law relating to mitigation of loss or damage on breach of a contract apply to a breach of this agreement. (For example, if the tenant breaches this agreement, the landlord will not be able to claim damages for loss which could have been avoided by reasonable effort by the landlord.)

RENTAL BOND

41. The landlord agrees that, where the landlord or the landlord's agent applies to the Rental Bond Board or the Civil and Administrative Tribunal for payment of the whole or part of the rental bond to the landlord, the landlord or the landlord's agent will provide the tenant with:
41.1 details of the amount claimed, and
41.2 copies of any quotations, accounts and receipts that are relevant to the claim, and
41.3 a copy of a completed condition report about the residential premises at the end of the residential tenancy agreement.

SMOKE ALARMS

42. The landlord agrees to:
42.1 ensure that smoke alarms are installed in accordance with the Environmental Planning and Assessment Act 1979 if that Act requires them to be installed in the premises and are functioning in accordance with the regulations under that Act, and
42.2 conduct an annual check of all smoke alarms installed on the residential premises to ensure that the smoke alarms are functioning, and
42.3 install or replace, or engage a person to install or replace, all removable batteries in all smoke alarms installed on the residential premises annually, except for smoke alarms that have a removable lithium battery, and
42.4 install or replace, or engage a person to install or replace, a removable lithium battery in a smoke alarm in the period specified by the manufacturer of the smoke alarm, and
42.5 engage an authorised electrician to repair or replace a hardwired smoke alarm, and
42.6 repair or replace, a smoke alarm within 2 business days of becoming aware that the smoke alarm is not working, unless the tenant notifies the landlord that the tenant will carry out the repair to the smoke alarm and the tenant carries out the repair, and
42.7 reimburse the tenant for the costs of a repair or replacement of a smoke alarm in accordance with clause 18 of the Residential Tenancies Regulation 2019, that the tenant is allowed to carry out.

Note 1: Under section 64A of the Residential Tenancies Act 2010, repairs to a smoke alarm (which includes a heat alarm) includes maintenance of a smoke alarm in working order by installing or replacing a battery in the smoke alarm.
Note 2: Clauses 42.2-42.7 do not apply to a landlord of premises that comprise or include a lot in a strata scheme (within the meaning of the Strata Schemes Management Act 2015) if the owners corporation is responsible for the repair and replacement of smoke alarms in the residential premises.
Note 3: A tenant who intends to carry out a repair to a smoke alarm may do so only in the circumstances prescribed for a tenant in clause 15 of the Residential Tenancies Regulation 2019.
Note 4: Section 64A of the Act provides that a smoke alarm includes a heat alarm.

43. The tenant agrees:
43.1 to notify the landlord if a repair or a replacement of a smoke alarm is required, including replacing a battery in the smoke alarm, and
43.2 that the tenant may only replace a battery in a battery-operated smoke alarm, or a back-up battery in a hardwired smoke alarm, if the smoke alarm has a removable battery or a removable back-up battery, and
43.3 to give the landlord written notice, as soon as practicable if the tenant will carry out and has carried out a repair or replacement, or engages a person to carry out a repair or replacement, in accordance with clauses 15-17 of the Residential Tenancies Regulation 2019.

Note: Clauses 43.2 and 43.3 do not apply to tenants under social housing tenancy agreements or tenants of premises that comprise or include a lot in a strata scheme (within the meaning of the Strata Schemes Management Act 2015) if the owners corporation is responsible for the repair and replacement of smoke alarms in the residential premises.

44. The landlord and tenant each agree not to remove or interfere with the operation of a smoke alarm installed on the residential premises unless they have a reasonable excuse to do so.

Note: The regulations made under the Environmental Planning and Assessment Act 1979 provide that it is an offence to remove or interfere with the operation of a smoke alarm or a heat alarm in particular circumstances.

SWIMMING POOLS

45. The landlord agrees to ensure that the requirements of the Swimming Pools Act 1992 have been complied with in respect of the swimming pool on the residential premises.

46. The landlord agrees to ensure that at the time that this residential tenancy agreement is entered into:
46.1 the swimming pool on the residential premises is registered under the Swimming Pools Act 1992 and has a valid certificate of compliance under that Act or a relevant occupation certificate within the meaning of that Act, and
46.2 a copy of that valid certificate of compliance or relevant occupation certificate is provided to the tenant.

Note: A swimming pool certificate of compliance is valid for 3 years from its date of issue.

LOOSE-FILL ASBESTOS INSULATION

47. The landlord agrees:
47.1 if, at the time that this residential tenancy agreement is entered into, the premises have been and remain listed on the LFAI Register, the tenant has been advised in writing by the landlord that the premises are listed on that Register, or
47.2 if, during the tenancy, the premises become listed on the LFAI Register, to advise the tenant in writing, within 14 days of the premises being listed on the Register, that the premises are listed on the Register.

COMBUSTIBLE CLADDING

48. The landlord agrees that if, during the tenancy, the landlord becomes aware of any of the following facts, the landlord will advise the tenant in writing within 14 days of becoming aware of the fact:
48.1 that the residential premises are part of a building in relation to which a notice of intention to issue a fire safety order, or a fire safety order, has been issued requiring rectification of the building regarding external combustible cladding,
48.2 that the residential premises are part of a building in relation to which a notice of intention to issue a building product rectification order, or a building product rectification order, has been issued requiring rectification of the building regarding external combustible cladding,
48.3 that the residential premises are part of a building where a development application or complying development certificate application has been lodged for rectification of the building regarding external combustible cladding.

SIGNIFICANT HEALTH OR SAFETY RISKS

49. The landlord agrees that if, during the tenancy, the landlord becomes aware that the premises are subject to a significant health or safety risk, the landlord will advise the tenant in writing, within 14 days of becoming aware, that the premises are subject to the significant health or safety risk and the nature of the risk.

ELECTRONIC SERVICE OF NOTICES AND OTHER DOCUMENTS

50. The landlord and the tenant agree:
50.1 to only serve any notices and any other documents, authorised or required by the Residential Tenancies Act 2010 or the regulations or this agreement, on the other party by email if the other party has provided express consent, either as part of this agreement or otherwise, that a specified email address is to be used for the purpose of serving notices and other documents, and
50.2 to notify the other party in writing within 7 days if the email address specified for electronic service of notices and other documents changes, and
50.3 that they may withdraw their consent to the electronic service of notices and other documents at any time, by notifying the other party in writing, and
50.4 if a notice is given withdrawing consent to electronic service of notices and other documents, following the giving of such notice, no further notices or other documents are to be served by email.

BREAK FEE FOR FIXED TERM OF NOT MORE THAN 3 YEARS

51. The tenant agrees that, if the tenant ends the residential tenancy agreement before the end of the fixed term of the agreement, the tenant must pay a break fee of the following amount if the fixed term is not more than 3 years:
51.1 4 weeks rent if less than 25% of the fixed term has expired,
51.2 3 weeks rent if 25% or more but less than 50% of the fixed term has expired,
51.3 2 weeks rent if 50% or more but less than 75% of the fixed term has expired,
51.4 1 week's rent if 75% or more of the fixed term has expired.

This clause does not apply if the tenant terminates a fixed term residential tenancy agreement for a fixed term of more than 3 years or if the tenant terminates a residential tenancy agreement early for a reason that is permitted under the Residential Tenancies Act 2010.

Note: Permitted reasons for early termination include destruction of residential premises, breach of the agreement by the landlord and an offer of social housing or a place in an aged care facility, and being in circumstances of domestic violence. Section 107 of the Residential Tenancies Act 2010 regulates the rights of the landlord and tenant under this clause.

52. The landlord agrees that the compensation payable by the tenant for ending the residential tenancy agreement before the end of the fixed term of not more than 3 years is limited to the amount specified in clause 51 and any occupation fee payable under the Residential Tenancies Act 2010 for goods left on the residential premises.

Note: Section 107 of the Residential Tenancies Act 2010 also regulates the rights of landlords and tenants for a residential tenancy agreement with a fixed term of more than 3 years.

LANDLORD'S CONSENT FOR PETS

53. The landlord and the tenant agree \u2013
53.1 the tenant may keep an animal at the residential premises with the landlord's consent, and

Note: The tenant does not need the landlord's consent to keep an assistance animal at the residential premises.

53.2 an application for consent to keep an animal at the premises must be made jointly by all co-tenants using the Fair Trading approved form and the landlord must respond in writing to the application using that form, and
53.3 the landlord may give consent to keep an animal at the premises subject to reasonable conditions, which are taken to be terms of this agreement.

54. The landlord agrees:
54.1 to respond to an application from the tenant for consent to keep an animal at the residential premises within 21 days, specifying either that consent is given and any reasonable conditions of the consent or that consent is refused and the grounds for refusing, and
54.2 if the landlord does not give a response under clause 54.1 to an application for consent to keep an animal, the landlord consents to the tenant keeping the animal at the premises without conditions, and
54.3 to not refuse to consent to an animal being kept at the premises except on a ground set out in the Residential Tenancies Act 2010, section 73F, and
54.4 to not impose an unreasonable condition on a consent to keep an animal at the premises, and

Note: The Residential Tenancies Act 2010, section 73E sets out what are reasonable and unreasonable conditions of a consent to keep an animal at the residential premises.

54.5 if the landlord consents to the tenant keeping an animal at the premises, the consent continues while the tenant resides at the premises for the lifetime of the animal.

TERMINATION

55. The landlord and the tenant agree to only end this agreement in accordance with the Residential Tenancies Act 2010 and the Residential Tenancies Regulation 2019.`;
var FT6600_NOTES = `========================================
NOTES
========================================

1. Definitions

In this agreement:
- landlord means the person who grants the right to occupy residential premises under this agreement, and includes a successor in title to the residential premises whose interest is subject to that of the tenant and a tenant who has granted the right to occupy residential premises to a sub-tenant.
- landlord's agent means a person who acts as the agent of the landlord and who (whether or not the person carries on any other business) carries on business as an agent for: (a) the letting of residential premises, or (b) the collection of rents payable for any tenancy of residential premises.
- LFAI Register means the register of residential premises that contain or have contained loose-fill asbestos insulation that is required to be maintained under Division 1A of Part 8 of the Home Building Act 1989.
- rental bond means money paid by the tenant as security to carry out this agreement.
- residential premises means any premises or part of premises (including any land occupied with the premises) used or intended to be used as a place of residence.
- tenancy means the right to occupy residential premises under this agreement.
- tenant means the person who has the right to occupy residential premises under this agreement, and includes the person to whom such a right passes by transfer or operation of the law and a sub-tenant of the tenant.

2. Continuation of tenancy (if fixed term agreement)

Once any fixed term of this agreement ends, the agreement continues in force on the same terms as a periodic agreement unless the agreement is terminated by the landlord or the tenant in accordance with the Residential Tenancies Act 2010 (see notes 3 and 4).

3. Ending this agreement

This agreement may be ended by the landlord or the tenant giving written notice of termination. The tenant may give notice at any time or on certain grounds. The landlord may only give notice on certain grounds. The Residential Tenancies Act 2010 sets out the grounds on which the landlord and the tenant may end this agreement. The grounds for the landlord ending this agreement include breach of this agreement by the tenant, sale of the residential premises requiring vacant possession, proposed sale of the residential premises, significant renovations or repairs to the residential premises, demolition of the residential premises, the residential premises ceasing to be used as rented residential premises or the landlord or the landlord's family moving into the residential premises. The grounds for the tenant ending this agreement include breach by the landlord of information disclosure provisions under the Act, section 26, breach of this agreement by the landlord or the tenant being in circumstances of domestic violence. Further grounds are set out in the Act, Parts 5 and 7.

4. Notice for ending fixed term agreement

If this agreement is a fixed term agreement, the tenant must give at least 14 days notice to end the agreement. Generally, the landlord must give at least 90 days notice, or at least 60 days notice if the agreement is for a fixed term of 6 months or less. However, the notice period is different for certain grounds for termination.

5. Notice for ending periodic agreement

If this agreement is a periodic agreement, the tenant must give at least 21 days notice to end the agreement. Generally, the landlord must give at least 90 days notice. However, the notice period is different for certain grounds for termination.

6. Warning

It is an offence for a person to obtain possession of the residential premises without an order of the Civil and Administrative Tribunal or a judgment or order of a court if the tenant does not willingly move out. A court can order fines and compensation be paid for such an offence. It is an offence for the landlord, or landlord's agent, to give a termination notice on a ground that is not genuine, to provide false or misleading supporting documents or information with a termination notice or, if an exclusion period applies, to enter into a new residential tenancy agreement for the residential premises during the exclusion period.`;

// src/lib/documents/NswResidentialTenancyAgreement.tsx
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
function rentDueWeekdayFromCommencement(isoDate) {
  const raw = isoDate.slice(0, 10);
  const [y, m, d] = raw.split("-").map(Number);
  if (!y || !m || !d) return "Monday";
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString("en-AU", { weekday: "long", timeZone: "UTC" });
}
var CONDITION_REPORT_VERBATIM = "A condition report relating to the condition of the premises must be completed by or on behalf of the landlord before or when this agreement is given to the tenant for signing.";
var TENANCY_LAWS_VERBATIM = "The Residential Tenancies Act 2010 and the Residential Tenancies Regulation 2019 apply to this agreement. Both the landlord and the tenant must comply with these laws.";
var RENT_OTHER_DETAIL = "Via Quni Living platform (quni.com.au)";
var FT_FORM_REFERENCE = "FT6600_171225 \u2014 NSW Fair Trading \u2014 Standard form from 19 May 2025";
var styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 44,
    paddingHorizontal: 42,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
    lineHeight: 1.55,
    backgroundColor: "#ffffff"
  },
  quniHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 0.75,
    borderBottomColor: "#c9d2e0"
  },
  logo: { width: 72, height: 22, objectFit: "contain", marginRight: 14 },
  headerTitleCol: { flex: 1, alignItems: "flex-end" },
  headerTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: "#0f2744",
    textAlign: "right"
  },
  headerSubtitle: {
    fontSize: 9,
    color: "#3d4f63",
    textAlign: "right",
    marginTop: 2
  },
  docMetaLine: {
    fontSize: 8,
    color: "#4a5568",
    marginTop: 6,
    textAlign: "right"
  },
  formRefLine: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: "#0f2744",
    marginTop: 4,
    marginBottom: 8
  },
  sectionHeading: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#0f2744",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginTop: 10,
    marginBottom: 6
  },
  subHeading: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#0f2744",
    marginTop: 8,
    marginBottom: 4
  },
  body: { fontSize: 10, lineHeight: 1.55, textAlign: "justify" },
  bodyTight: { fontSize: 10, lineHeight: 1.45, marginBottom: 4, textAlign: "justify" },
  importantIntro: { fontSize: 10, marginBottom: 6 },
  numberedPoint: { fontSize: 10, marginBottom: 5, textAlign: "justify" },
  labelBold: { fontFamily: "Helvetica-Bold", color: "#111827" },
  value: { fontFamily: "Helvetica", color: "#1a1a1a" },
  fieldRow: { marginBottom: 5, flexDirection: "row", flexWrap: "wrap" },
  checkboxRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 3 },
  checkboxBox: {
    width: 11,
    height: 11,
    borderWidth: 1,
    borderColor: "#374151",
    marginRight: 6,
    marginTop: 2,
    alignItems: "center",
    justifyContent: "center"
  },
  checkboxMark: { fontSize: 9, fontFamily: "Helvetica-Bold", marginTop: -1 },
  clauseSectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#0f2744",
    textTransform: "uppercase",
    marginTop: 8,
    marginBottom: 4,
    letterSpacing: 0.3
  },
  clauseNote: {
    fontSize: 9,
    fontFamily: "Helvetica-Oblique",
    color: "#374151",
    marginBottom: 4,
    marginLeft: 6,
    textAlign: "justify"
  },
  footerRow: {
    position: "absolute",
    bottom: 18,
    left: 42,
    right: 42,
    fontSize: 7.5,
    color: "#6b7280",
    borderTopWidth: 0.5,
    borderTopColor: "#e5e7eb",
    paddingTop: 4
  },
  sigBox: {
    borderWidth: 1,
    borderColor: "#9ca3af",
    minHeight: 36,
    marginTop: 4,
    marginBottom: 8,
    padding: 6
  },
  sigHint: { fontSize: 7, color: "#6b7280" }
});
function resolveQuniLogoPath() {
  const p = join(process.cwd(), "public", "quni-logo.png");
  return existsSync(p) ? p : null;
}
function formatMoney(n) {
  return n.toLocaleString("en-AU", { style: "currency", currency: "AUD" });
}
function formatAuDate(iso) {
  const d = iso.slice(0, 10);
  const parts = d.split("-");
  if (parts.length !== 3) return iso;
  const [y, m, day] = parts;
  if (!y || !m || !day) return iso;
  return `${day}/${m}/${y}`;
}
function agreementMadeOnFromGeneratedAt(generatedAt) {
  const idx = generatedAt.indexOf(",");
  if (idx > 0) return generatedAt.slice(0, idx).trim();
  return generatedAt.trim();
}
function suburbFromAddressLine(addressLine) {
  const t = addressLine.trim();
  if (!t || t === "\u2014") return t || "\u2014";
  const parts = t.split(",").map((s) => s.trim()).filter(Boolean);
  const stateIdx = parts.findIndex((p) => /^(NSW|VIC|QLD|SA|WA|TAS|ACT|NT)$/i.test(p));
  if (stateIdx > 0) return parts[stateIdx - 1] ?? parts[0] ?? t;
  if (parts.length >= 2) return parts[parts.length - 2] ?? t;
  return parts[0] ?? t;
}
function extractImportantFourPoints() {
  const marker = "Please read this before completing";
  const i = FT6600_TITLE_AND_IMPORTANT.indexOf(marker);
  return i >= 0 ? FT6600_TITLE_AND_IMPORTANT.slice(i) : FT6600_TITLE_AND_IMPORTANT;
}
function chunkText(text, maxChars) {
  if (text.length <= maxChars) return [text];
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + maxChars, text.length);
    if (end < text.length) {
      const cut = text.lastIndexOf("\n\n", end);
      if (cut > start) end = cut;
      else {
        const cut2 = text.lastIndexOf("\n", end);
        if (cut2 > start) end = cut2;
      }
    }
    chunks.push(text.slice(start, end));
    start = end;
  }
  return chunks;
}
function stripNotesAsciiBanner(s) {
  return s.replace(/^=+\r?\nNOTES\r?\n=+\r?\n\r?\n/i, "");
}
function isSectionHeadingLine(line) {
  const t = line.trim();
  if (t.length < 4 || t.length > 90) return false;
  if (/^\d/.test(t)) return false;
  if (/^note/i.test(t)) return false;
  if (t !== t.toUpperCase()) return false;
  if (!/^[A-Z0-9][A-Z0-9 '\-#&,]+$/.test(t)) return false;
  return true;
}
function isCrossedOutClauseLine(line) {
  const s = line.trimStart();
  return /^38\.\s/.test(s) || /^39\.\s/.test(s) || /^45\.\s/.test(s) || /^46(\.\s|\.\d+\s)/.test(s);
}
function ClauseLine({ line }) {
  const raw = line;
  const t = raw.trimEnd();
  if (!t) return /* @__PURE__ */ jsx(View, { style: { height: 3 } });
  if (isSectionHeadingLine(t)) {
    return /* @__PURE__ */ jsx(Text, { style: styles.clauseSectionTitle, children: t });
  }
  if (/^note/i.test(t.trim())) {
    return /* @__PURE__ */ jsx(Text, { style: styles.clauseNote, children: t });
  }
  const m = /^(\s*)(\d+(?:\.\d+)*\.?)(\s+)(.*)$/.exec(t);
  if (m) {
    const [, indent, num, sp, rest] = m;
    if (isCrossedOutClauseLine(t)) {
      return /* @__PURE__ */ jsxs(View, { style: { flexDirection: "row", flexWrap: "wrap", alignItems: "flex-start", marginBottom: 4 }, wrap: false, children: [
        /* @__PURE__ */ jsxs(Text, { style: { ...styles.bodyTight, textDecoration: "line-through", flex: 1, paddingRight: 6 }, children: [
          indent,
          /* @__PURE__ */ jsx(Text, { style: { fontFamily: "Helvetica-Bold" }, children: num }),
          sp,
          rest
        ] }),
        /* @__PURE__ */ jsx(Text, { style: { fontSize: 9, fontFamily: "Helvetica-Oblique", color: "#4b5563", marginTop: 1 }, children: "not applicable" })
      ] });
    }
    return /* @__PURE__ */ jsxs(Text, { style: styles.bodyTight, children: [
      indent,
      /* @__PURE__ */ jsx(Text, { style: { fontFamily: "Helvetica-Bold" }, children: num }),
      sp,
      rest
    ] });
  }
  return /* @__PURE__ */ jsx(Text, { style: styles.bodyTight, children: raw });
}
function ClauseChunkBody({ text }) {
  const lines = text.split(/\n/);
  return /* @__PURE__ */ jsx(View, { children: lines.map((line, i) => /* @__PURE__ */ jsx(ClauseLine, { line }, i)) });
}
function NotesBody({ text }) {
  const lines = text.split(/\n/);
  return /* @__PURE__ */ jsx(View, { children: lines.map((line, i) => {
    const t = line.trimEnd();
    if (!t.trim()) return /* @__PURE__ */ jsx(View, { style: { height: 3 } }, i);
    const head = /^(\d+)\.\s+(.+)$/.exec(t.trim());
    if (head && head[2] && /^[A-Z]/.test(head[2])) {
      return /* @__PURE__ */ jsx(Text, { style: { ...styles.bodyTight, marginTop: i > 0 ? 6 : 0 }, children: /* @__PURE__ */ jsx(Text, { style: styles.labelBold, children: `${head[1]}. ${head[2]}` }) }, i);
    }
    if (t.trim().startsWith("- ")) {
      return /* @__PURE__ */ jsx(Text, { style: styles.bodyTight, children: t }, i);
    }
    return /* @__PURE__ */ jsx(Text, { style: styles.bodyTight, children: t }, i);
  }) });
}
function Field({ label, children }) {
  return /* @__PURE__ */ jsx(View, { style: styles.fieldRow, wrap: false, children: /* @__PURE__ */ jsxs(Text, { style: styles.body, children: [
    /* @__PURE__ */ jsx(Text, { style: styles.labelBold, children: label }),
    " ",
    /* @__PURE__ */ jsx(Text, { style: styles.value, children })
  ] }) });
}
function Checkbox({ checked }) {
  return /* @__PURE__ */ jsx(View, { style: styles.checkboxBox, children: checked ? /* @__PURE__ */ jsx(Text, { style: styles.checkboxMark, children: "\u2713" }) : null });
}
function CheckboxLine({ checked, label }) {
  return /* @__PURE__ */ jsxs(View, { style: styles.checkboxRow, wrap: false, children: [
    /* @__PURE__ */ jsx(Checkbox, { checked }),
    /* @__PURE__ */ jsx(Text, { style: styles.body, children: /* @__PURE__ */ jsx(Text, { style: styles.value, children: label }) })
  ] });
}
function normalizeLeaseDescription(s) {
  return s.toLowerCase().replace(/[\u2013\u2014]/g, "-").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}
function wholeMonthsBetweenStartAndEnd(startIso, endIso) {
  const a = startIso.slice(0, 10);
  const b = endIso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(a) || !/^\d{4}-\d{2}-\d{2}$/.test(b)) return null;
  const [y1, m1, d1] = a.split("-").map(Number);
  const [y2, m2, d2] = b.split("-").map(Number);
  if (![y1, m1, d1, y2, m2, d2].every((n) => Number.isFinite(n))) return null;
  const t1 = Date.UTC(y1, m1 - 1, d1);
  const t2 = Date.UTC(y2, m2 - 1, d2);
  if (t2 <= t1) return null;
  let months = (y2 - y1) * 12 + (m2 - m1);
  if (d2 < d1) months -= 1;
  return months >= 1 ? months : 1;
}
function termChecksFromMonthBucket(months, otherText) {
  const base = {
    m6: false,
    m12: false,
    y2: false,
    y3: false,
    y5: false,
    periodic: false,
    other: false,
    otherText: null
  };
  if (months <= 3) {
    return {
      ...base,
      other: true,
      otherText: otherText ?? `${months} month${months === 1 ? "" : "s"}`
    };
  }
  if (months <= 8) return { ...base, m6: true };
  if (months <= 15) return { ...base, m12: true };
  if (months <= 27) return { ...base, y2: true };
  if (months <= 45) return { ...base, y3: true };
  return { ...base, y5: true };
}
function termCheckState(periodic, leaseLengthDescription, startDate, endDate) {
  if (periodic) {
    return {
      m6: false,
      m12: false,
      y2: false,
      y3: false,
      y5: false,
      periodic: true,
      other: false,
      otherText: null
    };
  }
  const trimmedDesc = leaseLengthDescription.trim();
  const d = normalizeLeaseDescription(trimmedDesc);
  if (/\bperiodic\b/.test(d) || /\bmonth[\s-]*to[\s-]*month\b/.test(d)) {
    return {
      m6: false,
      m12: false,
      y2: false,
      y3: false,
      y5: false,
      periodic: true,
      other: false,
      otherText: null
    };
  }
  if (/\b5\s*years?\b|\b5\s*yrs?\b|\b60\s*months?\b/.test(d)) {
    return {
      m6: false,
      m12: false,
      y2: false,
      y3: false,
      y5: true,
      periodic: false,
      other: false,
      otherText: null
    };
  }
  if (/\b3\s*years?\b|\b3\s*yrs?\b|\b36\s*months?\b/.test(d)) {
    return {
      m6: false,
      m12: false,
      y2: false,
      y3: true,
      y5: false,
      periodic: false,
      other: false,
      otherText: null
    };
  }
  if (/\b2\s*years?\b|\b2\s*yrs?\b|\b24\s*months?\b/.test(d)) {
    return {
      m6: false,
      m12: false,
      y2: true,
      y3: false,
      y5: false,
      periodic: false,
      other: false,
      otherText: null
    };
  }
  if (/\b12\s*months?\b|\b1\s*year\b|\b1\s*yr\b|\b52\s*weeks?\b/.test(d)) {
    return {
      m6: false,
      m12: true,
      y2: false,
      y3: false,
      y5: false,
      periodic: false,
      other: false,
      otherText: null
    };
  }
  if (/\b6\s*months?\b|\b26\s*weeks?\b/.test(d)) {
    return {
      m6: true,
      m12: false,
      y2: false,
      y3: false,
      y5: false,
      periodic: false,
      other: false,
      otherText: null
    };
  }
  if (/\b3\s*months?\b|\b13\s*weeks?\b/.test(d)) {
    return {
      m6: false,
      m12: false,
      y2: false,
      y3: false,
      y5: false,
      periodic: false,
      other: true,
      otherText: trimmedDesc || "3 months"
    };
  }
  const monthsFromDates = endDate && startDate ? wholeMonthsBetweenStartAndEnd(startDate, endDate) : null;
  if (monthsFromDates != null) {
    return termChecksFromMonthBucket(monthsFromDates, trimmedDesc || null);
  }
  const generic = d === "as agreed" || d === "" || d === "fixed term";
  if (generic) {
    return {
      m6: false,
      m12: false,
      y2: false,
      y3: false,
      y5: false,
      periodic: false,
      other: true,
      otherText: trimmedDesc || null
    };
  }
  return {
    m6: false,
    m12: false,
    y2: false,
    y3: false,
    y5: false,
    periodic: false,
    other: true,
    otherText: trimmedDesc || null
  };
}
function QuniTopHeader({
  documentId,
  generatedAt,
  logoPath
}) {
  return /* @__PURE__ */ jsxs(View, { style: styles.quniHeader, children: [
    logoPath ? /* @__PURE__ */ jsx(Image, { src: logoPath, style: styles.logo }) : /* @__PURE__ */ jsx(Text, { style: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#0f2744", marginRight: 12 }, children: "Quni" }),
    /* @__PURE__ */ jsxs(View, { style: styles.headerTitleCol, children: [
      /* @__PURE__ */ jsx(Text, { style: styles.headerTitle, children: "Residential Tenancy Agreement" }),
      /* @__PURE__ */ jsx(Text, { style: styles.headerSubtitle, children: "NSW \xB7 Residential Tenancies Act 2010" }),
      /* @__PURE__ */ jsxs(Text, { style: styles.docMetaLine, children: [
        "Document ID: ",
        documentId,
        " \xB7 Generated ",
        generatedAt
      ] })
    ] })
  ] });
}
function PageFooter({ documentId, pageNumber }) {
  return /* @__PURE__ */ jsx(View, { style: styles.footerRow, children: /* @__PURE__ */ jsxs(Text, { children: [
    documentId,
    " \xB7 Page ",
    pageNumber
  ] }) });
}
function SignaturesBlock(props) {
  const landlordName = props.landlord.fullName;
  const landlordSignIntro = "SIGNED BY THE LANDLORD\nNote: Section 9 of the Electronic Transactions Act 2000 allows for agreements to be signed electronically in NSW if the parties consent. If an electronic signature is used then it must comply with Division 2 of Part 2 of the Electronic Transactions Act 2000.\n\nName of landlord:";
  const lisHeadingAndBody = "LANDLORD INFORMATION STATEMENT\nThe landlord acknowledges that, at or before the time of signing this residential tenancy agreement, the landlord has read and understood the contents of the Landlord Information Statement published by NSW Fair Trading that sets out the landlord's rights and obligations.\n\nSignature of landlord:";
  const tenant1Banner = "\nSIGNED BY THE TENANT (1)\nName of tenant:";
  const tisHeadingAndBody = "TENANT INFORMATION STATEMENT\nThe tenant acknowledges that, at or before the time of signing this residential tenancy agreement, the tenant was given a copy of the Tenant Information Statement published by NSW Fair Trading.\n\nSignature of tenant:";
  const contactFooter = "For information about your rights and obligations as a landlord or tenant, contact:\n(a) NSW Fair Trading on 13 32 20 or nsw.gov.au/fair-trading or\n(b) Law Access NSW on 1300 888 529 or lawaccess.nsw.gov.au or\n(c) your local Tenants Advice and Advocacy Service at tenants.org.au";
  return /* @__PURE__ */ jsxs(View, { children: [
    /* @__PURE__ */ jsx(Text, { style: styles.sectionHeading, children: "Signatures" }),
    /* @__PURE__ */ jsx(Text, { style: styles.body, children: landlordSignIntro }),
    /* @__PURE__ */ jsx(Text, { style: styles.value, children: landlordName }),
    /* @__PURE__ */ jsx(View, { style: styles.sigBox, children: /* @__PURE__ */ jsxs(View, { style: { flexDirection: "row", alignItems: "center" }, children: [
      /* @__PURE__ */ jsx(Text, { style: styles.body, children: "Signature of landlord: " }),
      /* @__PURE__ */ jsx(Text, { style: styles.sigHint, children: "{{Landlord Signature;role=First Party;type=signature}}" })
    ] }) }),
    /* @__PURE__ */ jsx(View, { style: { ...styles.sigBox, minHeight: 28 }, children: /* @__PURE__ */ jsxs(View, { style: { flexDirection: "row", alignItems: "center" }, children: [
      /* @__PURE__ */ jsx(Text, { style: styles.sigHint, children: "Landlord Sign Date " }),
      /* @__PURE__ */ jsx(Text, { style: styles.sigHint, children: "{{Landlord Sign Date;role=First Party;type=date}}" })
    ] }) }),
    /* @__PURE__ */ jsx(Text, { style: styles.body, children: lisHeadingAndBody }),
    /* @__PURE__ */ jsx(View, { style: styles.sigBox, children: /* @__PURE__ */ jsx(Text, { style: styles.sigHint, children: "{{Landlord LIS Signature;role=First Party;type=signature}}" }) }),
    /* @__PURE__ */ jsx(View, { style: { ...styles.sigBox, minHeight: 28 }, children: /* @__PURE__ */ jsxs(View, { style: { flexDirection: "row", alignItems: "center" }, children: [
      /* @__PURE__ */ jsx(Text, { style: styles.sigHint, children: "Landlord LIS Date " }),
      /* @__PURE__ */ jsx(Text, { style: styles.sigHint, children: "{{Landlord LIS Date;role=First Party;type=date}}" })
    ] }) }),
    /* @__PURE__ */ jsx(Text, { style: styles.body, children: tenant1Banner }),
    /* @__PURE__ */ jsx(Text, { style: styles.value, children: props.tenant.fullName }),
    /* @__PURE__ */ jsx(View, { style: styles.sigBox, children: /* @__PURE__ */ jsxs(View, { style: { flexDirection: "row", alignItems: "center" }, children: [
      /* @__PURE__ */ jsx(Text, { style: styles.body, children: "Signature of tenant: " }),
      /* @__PURE__ */ jsx(Text, { style: styles.sigHint, children: "{{Tenant Signature;role=Second Party;type=signature}}" })
    ] }) }),
    /* @__PURE__ */ jsx(View, { style: { ...styles.sigBox, minHeight: 28 }, children: /* @__PURE__ */ jsxs(View, { style: { flexDirection: "row", alignItems: "center" }, children: [
      /* @__PURE__ */ jsx(Text, { style: styles.sigHint, children: "Tenant Sign Date " }),
      /* @__PURE__ */ jsx(Text, { style: styles.sigHint, children: "{{Tenant Sign Date;role=Second Party;type=date}}" })
    ] }) }),
    /* @__PURE__ */ jsx(Text, { style: styles.body, children: tisHeadingAndBody }),
    /* @__PURE__ */ jsx(View, { style: styles.sigBox, children: /* @__PURE__ */ jsx(Text, { style: styles.sigHint, children: "{{Tenant TIS Signature;role=Second Party;type=signature}}" }) }),
    /* @__PURE__ */ jsx(View, { style: { ...styles.sigBox, minHeight: 28 }, children: /* @__PURE__ */ jsxs(View, { style: { flexDirection: "row", alignItems: "center" }, children: [
      /* @__PURE__ */ jsx(Text, { style: styles.sigHint, children: "Tenant TIS Date " }),
      /* @__PURE__ */ jsx(Text, { style: styles.sigHint, children: "{{Tenant TIS Date;role=Second Party;type=date}}" })
    ] }) }),
    /* @__PURE__ */ jsx(Text, { style: { ...styles.body, marginTop: 12, fontSize: 9, lineHeight: 1.5 }, children: contactFooter })
  ] });
}
function NswResidentialTenancyAgreement(props) {
  const logoPath = resolveQuniLogoPath();
  const { documentId, generatedAt, landlord, tenant, premises, term, rent, bond, landlordAgent } = props;
  const urgent = props.urgentRepairsTradespeople;
  const es = props.electronicService;
  const importantBody = extractImportantFourPoints();
  const madeOn = agreementMadeOnFromGeneratedAt(generatedAt);
  const atSuburb = suburbFromAddressLine(premises.addressLine);
  const checks = termCheckState(term.periodic, term.leaseLengthDescription, term.startDate, term.endDate);
  const rentWeekday = rentDueWeekdayFromCommencement(term.startDate);
  const weeklyRentDisplay = formatMoney(rent.weeklyRent);
  const bondDisplay = bond.amount != null && Number.isFinite(bond.amount) ? formatMoney(bond.amount) : null;
  const inclusions = props.additionalPremisesInclusions.map((s) => s.trim()).filter(Boolean);
  const maxOcc = props.maxOccupantsPermitted != null && Number.isFinite(props.maxOccupantsPermitted) ? String(props.maxOccupantsPermitted) : null;
  const elecLine = (v) => v && v.trim() ? v.trim() : "";
  const endDateText = term.periodic || !term.endDate ? null : formatAuDate(term.endDate);
  const clauseChunks = chunkText(FT6600_CLAUSES_1_TO_55, 2600);
  const rawNotesChunks = chunkText(FT6600_NOTES, 3e3);
  const notesChunks = rawNotesChunks.map((c, i) => i === 0 ? stripNotesAsciiBanner(c) : c);
  let pageNum = 0;
  const nextPage = () => {
    pageNum += 1;
    return pageNum;
  };
  const pages = [];
  pages.push(
    /* @__PURE__ */ jsxs(Page, { size: "A4", style: styles.page, children: [
      /* @__PURE__ */ jsx(QuniTopHeader, { documentId, generatedAt, logoPath }),
      /* @__PURE__ */ jsx(Text, { style: styles.formRefLine, children: FT_FORM_REFERENCE }),
      /* @__PURE__ */ jsx(Text, { style: styles.sectionHeading, children: "Important information" }),
      /* @__PURE__ */ jsx(Text, { style: styles.importantIntro, children: importantBody }),
      /* @__PURE__ */ jsxs(Text, { style: styles.body, children: [
        /* @__PURE__ */ jsx(Text, { style: styles.labelBold, children: "THIS AGREEMENT WAS MADE ON: " }),
        madeOn,
        /* @__PURE__ */ jsx(Text, { style: styles.labelBold, children: " AT: " }),
        atSuburb
      ] }),
      /* @__PURE__ */ jsx(Text, { style: styles.sectionHeading, children: "Between" }),
      /* @__PURE__ */ jsx(Field, { label: "Landlord Name (1):", children: landlord.fullName }),
      /* @__PURE__ */ jsx(
        Field,
        {
          label: "Landlord telephone number or other contact details:",
          children: landlord.phone
        }
      ),
      /* @__PURE__ */ jsx(Field, { label: "Business or residential address of landlord(s) for service of notices:", children: landlord.addressLine }),
      /* @__PURE__ */ jsx(Field, { label: "Tenant Name (1):", children: tenant.fullName }),
      tenant.addressForServiceLine ? /* @__PURE__ */ jsx(Field, { label: "Tenant's address for service of notices:", children: tenant.addressForServiceLine }) : null,
      /* @__PURE__ */ jsx(Field, { label: "Contact details:", children: `Phone: ${tenant.phone} \xB7 Email: ${tenant.email}` }),
      landlordAgent ? /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx(Text, { style: styles.subHeading, children: "Landlord's agent details" }),
        /* @__PURE__ */ jsx(Field, { label: "Agent name:", children: landlordAgent.name }),
        /* @__PURE__ */ jsx(Field, { label: "Business address for service of notices:", children: landlordAgent.businessAddress }),
        /* @__PURE__ */ jsx(
          Field,
          {
            label: "Contact details:",
            children: `Phone: ${landlordAgent.phone}${landlordAgent.email ? ` \xB7 Email: ${landlordAgent.email}` : ""}`
          }
        )
      ] }) : /* @__PURE__ */ jsx(Field, { label: "Landlord's agent:", children: "Not applicable" }),
      /* @__PURE__ */ jsx(PageFooter, { documentId, pageNumber: nextPage() })
    ] }, "p1")
  );
  pages.push(
    /* @__PURE__ */ jsxs(Page, { size: "A4", style: styles.page, children: [
      /* @__PURE__ */ jsx(QuniTopHeader, { documentId, generatedAt, logoPath }),
      /* @__PURE__ */ jsx(Text, { style: styles.subHeading, children: "Term of agreement" }),
      /* @__PURE__ */ jsxs(View, { style: { marginBottom: 6 }, children: [
        /* @__PURE__ */ jsx(CheckboxLine, { checked: checks.m6, label: "6 months" }),
        /* @__PURE__ */ jsx(CheckboxLine, { checked: checks.m12, label: "12 months" }),
        /* @__PURE__ */ jsx(CheckboxLine, { checked: checks.y2, label: "2 years" }),
        /* @__PURE__ */ jsx(CheckboxLine, { checked: checks.y3, label: "3 years" }),
        /* @__PURE__ */ jsx(CheckboxLine, { checked: checks.y5, label: "5 years" }),
        /* @__PURE__ */ jsxs(View, { style: styles.checkboxRow, wrap: false, children: [
          /* @__PURE__ */ jsx(Checkbox, { checked: checks.other }),
          /* @__PURE__ */ jsxs(Text, { style: styles.body, children: [
            /* @__PURE__ */ jsx(Text, { style: styles.value, children: "Other (please specify): " }),
            checks.other && checks.otherText ? /* @__PURE__ */ jsx(Text, { style: styles.value, children: checks.otherText }) : null
          ] })
        ] }),
        /* @__PURE__ */ jsx(CheckboxLine, { checked: checks.periodic, label: "Periodic (no end date)" })
      ] }),
      /* @__PURE__ */ jsx(Field, { label: "Starting on:", children: formatAuDate(term.startDate) }),
      endDateText ? /* @__PURE__ */ jsx(Field, { label: "Ending on:", children: endDateText }) : null,
      /* @__PURE__ */ jsx(Text, { style: styles.subHeading, children: "Residential premises" }),
      /* @__PURE__ */ jsx(Field, { label: "The residential premises are:", children: premises.addressLine }),
      inclusions.length > 0 ? /* @__PURE__ */ jsx(Field, { label: "The residential premises include:", children: inclusions.join("; ") }) : null,
      /* @__PURE__ */ jsx(Text, { style: styles.subHeading, children: "Rent" }),
      /* @__PURE__ */ jsx(Field, { label: "The rent is:", children: weeklyRentDisplay }),
      /* @__PURE__ */ jsx(CheckboxLine, { checked: rent.rentFrequency === "weekly", label: "Rent must be paid per: week" }),
      /* @__PURE__ */ jsx(Field, { label: "Day rent must be paid:", children: rentWeekday }),
      /* @__PURE__ */ jsx(Field, { label: "Date first rent payment is due:", children: formatAuDate(term.startDate) }),
      /* @__PURE__ */ jsx(Text, { style: { ...styles.body, marginTop: 4, marginBottom: 2 }, children: "Rent must be paid by:" }),
      /* @__PURE__ */ jsx(CheckboxLine, { checked: false, label: "approved electronic bank transfer (such as direct debit, bank transfer or BPAY)" }),
      /* @__PURE__ */ jsx(CheckboxLine, { checked: false, label: "Centrepay" }),
      /* @__PURE__ */ jsx(CheckboxLine, { checked: true, label: "Other" }),
      /* @__PURE__ */ jsx(Field, { label: "Details of payment method:", children: RENT_OTHER_DETAIL }),
      bondDisplay ? /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx(Text, { style: styles.subHeading, children: "Rental bond" }),
        /* @__PURE__ */ jsx(Field, { label: "A rental bond of:", children: `${bondDisplay} must be paid by the tenant on signing this agreement.` }),
        /* @__PURE__ */ jsx(
          CheckboxLine,
          {
            checked: true,
            label: "The tenant provided the rental bond amount to: the landlord or another person"
          }
        ),
        /* @__PURE__ */ jsx(
          CheckboxLine,
          {
            checked: false,
            label: "The tenant provided the rental bond amount to: the landlord's agent"
          }
        ),
        /* @__PURE__ */ jsx(CheckboxLine, { checked: false, label: "NSW Fair Trading through Rental Bond Online." })
      ] }) : null,
      /* @__PURE__ */ jsx(Text, { style: styles.subHeading, children: "Important information" }),
      maxOcc ? /* @__PURE__ */ jsx(
        Field,
        {
          label: "Maximum number of occupants:",
          children: `No more than ${maxOcc} persons may ordinarily live in the premises at any one time.`
        }
      ) : null,
      /* @__PURE__ */ jsx(Text, { style: { ...styles.body, fontFamily: "Helvetica-Bold", marginTop: 4 }, children: "Urgent repairs" }),
      /* @__PURE__ */ jsx(Text, { style: styles.body, children: "Nominated tradespeople for urgent repairs" }),
      elecLine(urgent.electrician) ? /* @__PURE__ */ jsx(Field, { label: "Electrical repairs:", children: urgent.electrician }) : null,
      elecLine(urgent.plumber) ? /* @__PURE__ */ jsx(Field, { label: "Plumbing repairs:", children: urgent.plumber }) : null,
      elecLine(urgent.other) ? /* @__PURE__ */ jsx(Field, { label: "Other repairs:", children: urgent.other }) : null,
      /* @__PURE__ */ jsx(Field, { label: "Will the tenant be required to pay separately for water usage?", children: "No" }),
      /* @__PURE__ */ jsx(Field, { label: "Is electricity supplied to the premises from an embedded network?", children: "No" }),
      /* @__PURE__ */ jsx(Field, { label: "Is gas supplied to the premises from an embedded network?", children: "No" }),
      /* @__PURE__ */ jsx(
        Field,
        {
          label: "Smoke alarms:",
          children: "Battery operated smoke alarms"
        }
      ),
      /* @__PURE__ */ jsx(Field, { label: "Are there any strata or community scheme by-laws applicable to the residential premises?", children: "No" }),
      /* @__PURE__ */ jsx(Text, { style: { ...styles.body, fontFamily: "Helvetica-Bold", marginTop: 8 }, children: "Giving notices and other documents electronically" }),
      /* @__PURE__ */ jsx(Field, { label: "Landlord \u2014 express consent to electronic service?", children: es.landlordConsentsToEmailService ? "Yes" : "No" }),
      es.landlordConsentsToEmailService ? /* @__PURE__ */ jsx(Field, { label: "Landlord email for electronic service:", children: es.landlordEmail }) : null,
      /* @__PURE__ */ jsx(Field, { label: "Tenant \u2014 express consent to electronic service?", children: es.tenantConsentsToEmailService ? "Yes" : "No" }),
      es.tenantConsentsToEmailService ? /* @__PURE__ */ jsx(Field, { label: "Tenant email for electronic service:", children: es.tenantEmail }) : null,
      /* @__PURE__ */ jsx(Text, { style: { ...styles.subHeading, marginTop: 10 }, children: "Condition report" }),
      /* @__PURE__ */ jsx(Text, { style: styles.body, children: CONDITION_REPORT_VERBATIM }),
      /* @__PURE__ */ jsx(Text, { style: { ...styles.subHeading, marginTop: 8 }, children: "Tenancy laws" }),
      /* @__PURE__ */ jsx(Text, { style: styles.body, children: TENANCY_LAWS_VERBATIM }),
      /* @__PURE__ */ jsx(PageFooter, { documentId, pageNumber: nextPage() })
    ] }, "p2")
  );
  clauseChunks.forEach((chunk, i) => {
    pages.push(
      /* @__PURE__ */ jsxs(Page, { size: "A4", style: styles.page, children: [
        /* @__PURE__ */ jsx(QuniTopHeader, { documentId, generatedAt, logoPath }),
        i === 0 ? /* @__PURE__ */ jsx(Text, { style: styles.sectionHeading, children: "The agreement" }) : null,
        /* @__PURE__ */ jsx(ClauseChunkBody, { text: chunk }),
        /* @__PURE__ */ jsx(PageFooter, { documentId, pageNumber: nextPage() })
      ] }, `clause-${i}`)
    );
  });
  notesChunks.forEach((chunk, i) => {
    pages.push(
      /* @__PURE__ */ jsxs(Page, { size: "A4", style: styles.page, children: [
        /* @__PURE__ */ jsx(QuniTopHeader, { documentId, generatedAt, logoPath }),
        i === 0 ? /* @__PURE__ */ jsx(Text, { style: styles.sectionHeading, children: "Notes" }) : null,
        /* @__PURE__ */ jsx(NotesBody, { text: chunk }),
        /* @__PURE__ */ jsx(PageFooter, { documentId, pageNumber: nextPage() })
      ] }, `notes-${i}`)
    );
  });
  pages.push(
    /* @__PURE__ */ jsxs(Page, { size: "A4", style: styles.page, children: [
      /* @__PURE__ */ jsx(QuniTopHeader, { documentId, generatedAt, logoPath }),
      /* @__PURE__ */ jsx(SignaturesBlock, { ...props }),
      /* @__PURE__ */ jsx(PageFooter, { documentId, pageNumber: nextPage() })
    ] }, "sig")
  );
  return /* @__PURE__ */ jsx(Document, { children: pages });
}
export {
  NswResidentialTenancyAgreement
};
