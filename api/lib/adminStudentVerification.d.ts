export type AdminVerificationItem =
  | 'id_document'
  | 'enrolment_doc'
  | 'identity_supporting_doc'
  | 'visa_doc'
  | 'uni_email'
  | 'work_email'

export type AdminVerificationAction = 'verify' | 'in_review' | 'clear'

export function parseAdminVerificationItem(raw: unknown): AdminVerificationItem | null

export function parseAdminVerificationAction(raw: unknown): AdminVerificationAction | null

export function adminVerificationItemSupportsInReview(item: AdminVerificationItem): boolean

export function buildAdminVerificationPatch(
  item: AdminVerificationItem,
  action: AdminVerificationAction,
  nowIso: string,
): Record<string, unknown>

export function parseAdminVerificationLegalNames(
  item: AdminVerificationItem,
  action: AdminVerificationAction,
  legalFirstName: unknown,
  legalLastName: unknown,
):
  | { ok: true; firstName?: string; lastName?: string }
  | { ok: false; error: string; status: number }

export function buildLegalNameLockPatch(
  firstName: string,
  lastName: string,
  nowIso: string,
  setByUserId: string,
): Record<string, unknown>

export function tierToSync(
  profile: Record<string, unknown> | null | undefined,
): 'student' | 'identity' | 'none' | null
