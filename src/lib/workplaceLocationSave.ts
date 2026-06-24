export type WorkplaceLocationFields = {
  label: string
  address: string
  suburb: string
  state: string
  postcode: string
}

export type WorkplaceGeocodePoint = { lat: number; lon: number } | null

export function workplaceLocationFieldsTouched(fields: WorkplaceLocationFields): boolean {
  return Boolean(
    fields.label.trim() ||
      fields.address.trim() ||
      fields.suburb.trim() ||
      fields.postcode.trim(),
  )
}

export function validateWorkplaceLocationFields(fields: WorkplaceLocationFields): string | null {
  const sub = fields.suburb.trim()
  const st = fields.state.trim()
  const pc = fields.postcode.trim()
  if (!sub || !st || !pc) {
    return 'Suburb, state and postcode are required when saving a work location.'
  }
  return null
}

export function workplaceLocationUpdatePayload(
  fields: WorkplaceLocationFields,
  pt: WorkplaceGeocodePoint,
  nowIso: string,
) {
  const sub = fields.suburb.trim()
  const st = fields.state.trim().toUpperCase()
  const pc = fields.postcode.trim()
  return {
    workplace_label: fields.label.trim() || null,
    workplace_address: fields.address.trim() || null,
    workplace_suburb: sub,
    workplace_state: st,
    workplace_postcode: pc,
    workplace_latitude: pt?.lat ?? null,
    workplace_longitude: pt?.lon ?? null,
    workplace_geocoded_at: pt ? nowIso : null,
  }
}
