import {
  CAPTURABLE_UTILITY_SERVICE_IDS,
  UTILITY_SERVICE_DISPLAY_LABELS,
  parseApportionmentPercentInput,
  type CapturableUtilityServiceId,
} from './propertyUtilitiesServices'
import type { LandlordPropertyUtilitiesFormState, PerServiceUtilitiesFormState } from './propertyUtilitiesFormState'

export type UtilitiesFieldIssue = { id: string; message: string }

function missingPerServiceFormIssues(
  id: CapturableUtilityServiceId,
  form: PerServiceUtilitiesFormState,
): UtilitiesFieldIssue[] {
  const label = UTILITY_SERVICE_DISPLAY_LABELS[id]
  if (!form.tenantPays) {
    return [
      {
        id: `utilities-${id}-tenant-pays`,
        message: `Specify whether the tenant pays for ${label.toLowerCase()}.`,
      },
    ]
  }
  if (form.tenantPays !== 'yes') return []

  const issues: UtilitiesFieldIssue[] = []
  if (!form.individuallyMetered) {
    issues.push({
      id: `utilities-${id}-metered`,
      message: `Specify whether ${label.toLowerCase()} is individually metered.`,
    })
  } else if (
    form.individuallyMetered === 'no' &&
    parseApportionmentPercentInput(form.apportionmentPercent) == null
  ) {
    issues.push({
      id: `utilities-${id}-apportionment`,
      message: `Enter the percentage of the total ${label.toLowerCase()} charge the tenant must pay (1–100, Form 18a Item 14).`,
    })
  }
  if (!form.howMustBePaid.trim()) {
    issues.push({
      id: `utilities-${id}-how-paid`,
      message: `Describe how the tenant pays for ${label.toLowerCase()} (Form 18a Item 15).`,
    })
  }
  return issues
}

export function missingPerServiceUtilitiesFormIssues(form: LandlordPropertyUtilitiesFormState): UtilitiesFieldIssue[] {
  const issues: UtilitiesFieldIssue[] = []
  for (const id of CAPTURABLE_UTILITY_SERVICE_IDS) {
    issues.push(...missingPerServiceFormIssues(id, form[id]))
  }
  return issues
}

export function missingPerServiceUtilitiesFormMessages(form: LandlordPropertyUtilitiesFormState): string[] {
  return missingPerServiceUtilitiesFormIssues(form).map((issue) => issue.message)
}
