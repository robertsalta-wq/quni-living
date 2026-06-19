/** Columns for listing detail page (single property by slug). */
export const PROPERTY_DETAIL_SELECT = `
  *,
  landlord_profiles ( id, full_name, avatar_url, verified, languages_spoken ),
  universities ( id, name, slug ),
  campuses ( id, name ),
  property_features ( features ( id, name, icon ) ),
  property_house_rules ( permitted, rule_id, house_rules_ref ( id, name, icon ) )
`
