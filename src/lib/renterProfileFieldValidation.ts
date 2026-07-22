import { isValidAuPhone } from './studentOnboarding'
import {
  workplaceLocationFieldsTouched,
  type WorkplaceLocationFields,
} from './workplaceLocationSave'
import { renterControlClass } from './renterProfileFormClasses'

export const RENTER_SAVE_WRITE_FAILURE = "Couldn't save — try again"

export function buildRenterSectionSaveHint(
  fieldErrors: Record<string, string>,
  hintLabels: Record<string, string>,
): string {
  const labels = Object.keys(fieldErrors)
    .map((key) => hintLabels[key])
    .filter((label): label is string => Boolean(label))
  if (labels.length === 0) return 'Complete the required fields to save.'
  if (labels.length === 1) return `Add your ${labels[0]} to save.`
  if (labels.length === 2) return `Add your ${labels[0]} and ${labels[1]} to save.`
  const last = labels[labels.length - 1]
  const rest = labels.slice(0, -1).join(', ')
  return `Add your ${rest}, and ${last} to save.`
}

export function renterFieldClass(baseClass: string, hasError: boolean): string {
  return renterControlClass(baseClass, hasError)
}

export function personalSectionFieldErrors(draft: {
  firstName: string
  lastName: string
  phone: string
  gender: string
}): Record<string, string> {
  const fieldErrors: Record<string, string> = {}
  if (!draft.firstName.trim()) fieldErrors.firstName = 'First name is required.'
  if (!draft.lastName.trim()) fieldErrors.lastName = 'Last name is required.'
  if (!draft.phone.trim()) fieldErrors.phone = 'Phone number is required.'
  else if (!isValidAuPhone(draft.phone)) fieldErrors.phone = 'Enter a valid Australian phone number.'
  if (!draft.gender.trim()) fieldErrors.gender = 'Select your gender.'
  return fieldErrors
}

export function emergencySectionFieldErrors(draft: {
  emergencyName: string
  emergencyPhone: string
}): Record<string, string> {
  const fieldErrors: Record<string, string> = {}
  if (!draft.emergencyName.trim()) fieldErrors.emergencyName = 'Emergency contact name is required.'
  if (!draft.emergencyPhone.trim()) fieldErrors.emergencyPhone = 'Emergency contact phone is required.'
  else if (!isValidAuPhone(draft.emergencyPhone)) {
    fieldErrors.emergencyPhone = 'Enter a valid emergency contact phone number.'
  }
  return fieldErrors
}

export function guarantorSectionFieldErrors(draft: {
  guarantorName: string
  guarantorRelationship: string
  guarantorPhone: string
  guarantorEmail: string
  guarantorIncomeBand: string
  guarantorConsent: boolean
}): Record<string, string> {
  const fieldErrors: Record<string, string> = {}
  if (!draft.guarantorName.trim()) fieldErrors.guarantorName = 'Guarantor name is required.'
  if (!draft.guarantorRelationship.trim()) fieldErrors.guarantorRelationship = 'Guarantor relationship is required.'
  if (!draft.guarantorPhone.trim()) fieldErrors.guarantorPhone = 'Guarantor phone is required.'
  else if (!isValidAuPhone(draft.guarantorPhone)) {
    fieldErrors.guarantorPhone = 'Enter a valid guarantor phone number.'
  }
  if (!draft.guarantorEmail.trim()) fieldErrors.guarantorEmail = 'Guarantor email is required.'
  if (!draft.guarantorIncomeBand.trim()) fieldErrors.guarantorIncomeBand = 'Please select guarantor income band.'
  if (!draft.guarantorConsent) fieldErrors.guarantorConsent = 'Please confirm your guarantor has consented.'
  return fieldErrors
}

export function studentRouteSectionFieldErrors(draft: {
  universityId: string
  course: string
  studyLevel: string
  incomeBand: string
}): Record<string, string> {
  const fieldErrors: Record<string, string> = {}
  if (!draft.universityId.trim()) fieldErrors.universityId = 'Please select your university.'
  if (!draft.course.trim()) fieldErrors.course = 'Please enter your course or degree.'
  if (!draft.studyLevel.trim()) fieldErrors.studyLevel = 'Please select your year of study.'
  if (!draft.incomeBand.trim()) fieldErrors.incomeBand = 'Please select your weekly income band.'
  return fieldErrors
}

export function workingRouteSectionFieldErrors(
  draft: {
    employmentStatus: string
    employerName: string
    jobTitle: string
    employmentType: string
    incomeBand: string
  },
  workplaceFields: WorkplaceLocationFields,
): Record<string, string> {
  const fieldErrors: Record<string, string> = {}
  if (!draft.employmentStatus.trim()) fieldErrors.employmentStatus = 'Please select your employment status.'
  if (!draft.employerName.trim()) fieldErrors.employerName = 'Employer name is required.'
  if (!draft.jobTitle.trim()) fieldErrors.jobTitle = 'Job title is required.'
  if (!draft.employmentType.trim()) fieldErrors.employmentType = 'Please select your employment type.'
  if (!draft.incomeBand.trim()) fieldErrors.incomeBand = 'Please select your weekly income band.'

  if (workplaceLocationFieldsTouched(workplaceFields)) {
    const sub = workplaceFields.suburb.trim()
    const st = workplaceFields.state.trim()
    const pc = workplaceFields.postcode.trim()
    if (!sub) fieldErrors.workplaceSuburb = 'Suburb is required when saving a work location.'
    if (!st) fieldErrors.workplaceState = 'State is required when saving a work location.'
    if (!pc) fieldErrors.workplacePostcode = 'Postcode is required when saving a work location.'
  }

  return fieldErrors
}

export function visaRouteSectionFieldErrors(draft: {
  visaStatus: string
  visaSubclass: string
  visaExpiry: string
  incomeBand: string
}): Record<string, string> {
  const fieldErrors: Record<string, string> = {}
  if (!draft.visaStatus.trim()) fieldErrors.visaStatus = 'Please select your visa status.'
  if (!draft.visaSubclass.trim()) fieldErrors.visaSubclass = 'Visa subclass is required (e.g. 417, 462).'
  if (!draft.visaExpiry.trim()) fieldErrors.visaExpiry = 'Visa expiry date is required.'
  if (!draft.incomeBand.trim()) fieldErrors.incomeBand = 'Please select your weekly income band.'
  return fieldErrors
}

export function generalRouteSectionFieldErrors(draft: {
  incomeBand: string
  incomeSource: string
}): Record<string, string> {
  const fieldErrors: Record<string, string> = {}
  if (!draft.incomeBand.trim()) fieldErrors.incomeBand = 'Please select your weekly income band.'
  if (!draft.incomeSource.trim()) fieldErrors.incomeSource = 'Please select your income source.'
  return fieldErrors
}

export function livingPreferencesSectionFieldErrors(draft: {
  budgetMin: string
  budgetMax: string
}): Record<string, string> {
  const fieldErrors: Record<string, string> = {}
  if (draft.budgetMin.trim() && Number.isNaN(Number(draft.budgetMin))) {
    fieldErrors.budgetMin = 'Budget minimum must be a number.'
  }
  if (draft.budgetMax.trim() && Number.isNaN(Number(draft.budgetMax))) {
    fieldErrors.budgetMax = 'Budget maximum must be a number.'
  }
  return fieldErrors
}

export function termsSectionFieldErrors(accepted: boolean): Record<string, string> {
  if (accepted) return {}
  return { agreeTerms: 'Please accept the Terms of Service and Privacy Policy to continue.' }
}
