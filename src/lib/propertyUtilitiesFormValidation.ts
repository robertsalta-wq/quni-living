import {
  CAPTURABLE_UTILITY_SERVICE_IDS,
  UTILITY_SERVICE_DISPLAY_LABELS,
  type CapturableUtilityServiceId,
} from './propertyUtilitiesServices'
import type { LandlordPropertyUtilitiesFormState, PerServiceUtilitiesFormState } from './propertyUtilitiesFormState'

function missingPerServiceFormMessages(
  id: CapturableUtilityServiceId,
  form: PerServiceUtilitiesFormState,
): string[] {
  const label = UTILITY_SERVICE_DISPLAY_LABELS[id]
  const messages: string[] = []
  if (!form.tenantPays) {
    messages.push(`Specify whether the tenant pays for ${label.toLowerCase()}.`)
    return messages
  }
  if (form.tenantPays !== 'yes') return messages

  if (!form.individuallyMetered) {
    messages.push(`Specify whether ${label.toLowerCase()} is individually metered.`)
    return messages
  }
  if (form.individuallyMetered === 'no' && !form.apportionmentMethod.trim()) {
    messages.push(`Describe how the tenant's share of ${label.toLowerCase()} is worked out (Form 18a Item 14).`)
  }
  if (!form.howMustBePaid.trim()) {
    messages.push(`Describe how the tenant pays for ${label.toLowerCase()} (Form 18a Item 15).`)
  }
  return messages
}

export function missingPerServiceUtilitiesFormMessages(form: LandlordPropertyUtilitiesFormState): string[] {
  const messages: string[] = []
  for (const id of CAPTURABLE_UTILITY_SERVICE_IDS) {
    messages.push(...missingPerServiceFormMessages(id, form[id]))
  }
  return messages
}
