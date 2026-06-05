/** Quinn/Robert Listing FT6600 fixture - E2E fill tests and draft regen script. */

export const QUINN_ROBERT_FT6600_PROPERTY = {
  address: 'Unit 406/311 Hume Highway',
  suburb: 'Liverpool',
  state: 'NSW',
  postcode: '2170',
  max_occupants: 2,
  bond: 800,
  property_type: 'private_room_landlord_off_site',
  room_type: 'Private room',
  furnished: true,
  linen_supplied: true,
  weekly_cleaning_service: false,
  property_features: [{ features: { name: 'Bills included' } }],
  smoke_alarm_type: 'battery',
  smoke_alarm_battery_tenant_replaceable: false,
  water_usage_charged_separately: false,
  electricity_embedded_network: false,
  gas_embedded_network: false,
  strata_bylaws_applicable: false,
  strata_oc_responsible_for_alarms: null,
} as const

export const QUINN_ROBERT_FT6600_BOOKING = {
  move_in_date: '2026-06-10',
  end_date: '2026-12-10',
  lease_length: '6 months',
  weekly_rent: 400,
  notes: null,
  occupant_count: 2,
} as const

export const QUINN_ROBERT_FT6600_LISTING_INPUT = {
  documentId: 'nsw-ft6600-quinn-robert-listing',
  generatedAt: '03/06/2026, 10:00:00 am',
  serviceTier: 'listing' as const,
  booking: QUINN_ROBERT_FT6600_BOOKING,
  landlordProfile: {
    first_name: 'Quinn',
    last_name: 'Lee',
    full_name: 'Quinn Lee',
    email: 'quinniele90@gmail.com',
    phone: '+61410025719',
    address: '18 Malvina Street',
    suburb: 'Ryde',
    state: 'NSW',
    postcode: '2112',
    company_name: null,
  },
  studentProfile: {
    first_name: 'Robert',
    last_name: 'Saltalamacchia',
    full_name: 'Robert Saltalamacchia',
    email: 'rob@3thingsatonce.com.au',
    phone: '+61425775308',
    workplace_address: null,
    workplace_suburb: null,
    workplace_state: null,
    workplace_postcode: null,
  },
  property: QUINN_ROBERT_FT6600_PROPERTY,
  bankDetails: {
    bsb: '939200',
    accountNumber: '823175945',
    accountName: 'QUINNVESTMENTS PTY LTD',
    bankName: 'Bank',
  },
}
