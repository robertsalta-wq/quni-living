/** Shared PostgREST select for `PropertyCard` + listings rows. */
export const PROPERTY_CARD_LIST_SELECT = `
  *,
  landlord_profiles ( id, full_name, avatar_url, verified ),
  universities ( id, name, slug ),
  campuses ( id, name, slug )
`
