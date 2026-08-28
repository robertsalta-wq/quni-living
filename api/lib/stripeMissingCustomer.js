/**
 * Stripe "No such customer" / deleted Customer - stored id is not usable in this Stripe account or mode.
 *
 * @param {unknown} err
 * @returns {boolean}
 */
export function isStripeMissingCustomerError(err) {
  if (!err || typeof err !== 'object') return false
  const code = 'code' in err && typeof err.code === 'string' ? err.code : ''
  if (code === 'resource_missing') return true
  const type = 'type' in err && typeof err.type === 'string' ? err.type : ''
  if (type === 'StripeInvalidRequestError') {
    const msg = 'message' in err && typeof err.message === 'string' ? err.message : ''
    return /no such customer/i.test(msg)
  }
  const msg = 'message' in err && typeof err.message === 'string' ? err.message : ''
  return /^No such customer:/i.test(msg)
}

/**
 * @param {unknown} customer
 * @returns {boolean}
 */
export function stripeCustomerIsUsable(customer) {
  if (!customer || typeof customer !== 'object') return false
  if ('deleted' in customer && customer.deleted === true) return false
  const id = 'id' in customer && typeof customer.id === 'string' ? customer.id.trim() : ''
  return id.startsWith('cus_')
}
