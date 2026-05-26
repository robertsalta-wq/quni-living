/**
 * @deprecated Peer messaging cutover — new listing contact uses conversations API.
 * Returns 410. Kept so old clients fail clearly instead of sending legacy enquiry emails.
 */
import { jsonResponse, optionsResponse } from './lib/publicEmailRoute.js'

export const config = {
  runtime: 'edge',
}

export default async function handler(request: Request) {
  const origin = request.headers.get('origin') || '*'

  if (request.method === 'OPTIONS') {
    return optionsResponse(origin)
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, origin)
  }

  return jsonResponse(
    {
      ok: false,
      error: 'deprecated',
      message: 'Listing enquiries now use in-app messaging. Sign in and tap Message landlord on the property page.',
    },
    410,
    origin,
  )
}
