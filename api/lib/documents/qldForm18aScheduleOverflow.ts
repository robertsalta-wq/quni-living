/**
 * QLD Form 18a Items 14/15 overflow via Part 3 Special Terms (page 12).
 * Prescribed form prints "See special terms (page 12)" beside narrow schedule fields.
 */
import type { PDFFont, PDFForm } from 'pdf-lib'
import type { PropertyUtilitiesResolution } from '../../../src/lib/propertyUtilitiesResolver.js'
import type { CapturableUtilityServiceId } from '../../../src/lib/propertyUtilitiesServices.js'
import { UTILITY_SERVICE_DISPLAY_LABELS } from '../../../src/lib/propertyUtilitiesServices.js'
import { singleLineFitsInFieldWithoutTruncation } from './officialNswFt6600BurnIn.js'
import { QLD_FORM18A_RENAMED_FIELDS as F } from './qldForm18aRenamedFields.js'

export const QLD_FORM18A_SPECIAL_TERMS_POINTER = 'See special terms (page 12)'

type ScheduleFieldBinding = {
  serviceId: CapturableUtilityServiceId
  apportionmentField: string
  howPaidField: string
}

const CAPTURABLE_SCHEDULE_BINDINGS: ScheduleFieldBinding[] = [
  {
    serviceId: 'electricity',
    apportionmentField: F.Cost_for_electricity,
    howPaidField: F.How_electricity_must_be_paid_for,
  },
  {
    serviceId: 'gas',
    apportionmentField: F.Cost_for_gas,
    howPaidField: F.How_gas_must_be_paid_for,
  },
]

type Rect = { x: number; y: number; width: number; height: number }

function fieldRect(form: PDFForm, fieldName: string): Rect | null {
  try {
    const field = form.getTextField(fieldName)
    const widget = field.acroField.getWidgets()[0]
    if (!widget) return null
    return widget.getRectangle()
  } catch {
    return null
  }
}

function resolveScheduleValue(
  fullText: string,
  fieldName: string,
  form: PDFForm,
  font: PDFFont,
  specialTermsLine: string,
): { scheduleValue: string; overflowLine: string | null } {
  const trimmed = fullText.replace(/\s+/g, ' ').trim()
  if (!trimmed) return { scheduleValue: '', overflowLine: null }

  const rect = fieldRect(form, fieldName)
  if (!rect || !singleLineFitsInFieldWithoutTruncation(trimmed, font, rect)) {
    return { scheduleValue: QLD_FORM18A_SPECIAL_TERMS_POINTER, overflowLine: specialTermsLine }
  }
  return { scheduleValue: trimmed, overflowLine: null }
}

export type UtilitiesScheduleOverflowResult = {
  scheduleAssignments: Array<[string, string]>
  specialTermsLines: string[]
}

/** Map Items 14/15 from resolver output; overflow long values to Special Terms. */
export function resolveUtilitiesScheduleOverflow(
  form: PDFForm,
  font: PDFFont,
  utilities: PropertyUtilitiesResolution,
): UtilitiesScheduleOverflowResult {
  const scheduleAssignments: Array<[string, string]> = []
  const specialTermsLines: string[] = []

  for (const binding of CAPTURABLE_SCHEDULE_BINDINGS) {
    const service = utilities.services[binding.serviceId]
    const label = UTILITY_SERVICE_DISPLAY_LABELS[binding.serviceId]
    if (!service.tenantMustPay) continue

    if (service.apportionmentCost?.trim()) {
      const resolved = resolveScheduleValue(
        service.apportionmentCost,
        binding.apportionmentField,
        form,
        font,
        `${label} apportionment (Item 14): ${service.apportionmentCost.trim()}`,
      )
      if (resolved.scheduleValue) {
        scheduleAssignments.push([binding.apportionmentField, resolved.scheduleValue])
      }
      if (resolved.overflowLine) specialTermsLines.push(resolved.overflowLine)
    }

    if (service.howMustBePaid?.trim()) {
      const resolved = resolveScheduleValue(
        service.howMustBePaid,
        binding.howPaidField,
        form,
        font,
        `${label} — how must be paid (Item 15): ${service.howMustBePaid.trim()}`,
      )
      if (resolved.scheduleValue) {
        scheduleAssignments.push([binding.howPaidField, resolved.scheduleValue])
      }
      if (resolved.overflowLine) specialTermsLines.push(resolved.overflowLine)
    }
  }

  return { scheduleAssignments, specialTermsLines }
}

export function composeQldForm18aSpecialTermsText(args: {
  utilitiesOverflowLines: string[]
  specialConditions: string[]
  bookingNotes: string | null
}): string {
  const lines: string[] = []
  for (const line of args.utilitiesOverflowLines) {
    const t = line.trim()
    if (t) lines.push(t)
  }
  for (const line of args.specialConditions) {
    const t = line.trim()
    if (t) lines.push(t)
  }
  if (args.bookingNotes?.trim()) {
    lines.push(`Booking notes: ${args.bookingNotes.trim()}`)
  }
  if (lines.length === 0) {
    return 'Nil additional special terms at execution.'
  }
  return lines.join('\n')
}
