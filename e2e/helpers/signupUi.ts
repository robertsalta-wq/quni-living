import { expect, type Locator, type Page } from '@playwright/test'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isRenterRole } from '../../src/lib/marketplaceRole'
import type { AccommodationRoute } from './supabaseAdmin'

export const POST_EMAIL_CONFIRM_RENTER_PATH = /\/student-profile/

export async function completeEmailSignupUi(
  page: Page,
  _route: AccommodationRoute,
  email: string,
  password: string,
  fullName = 'E2E Confirm Test',
): Promise<void> {
  await page.goto('/signup')

  await page
    .getByRole('button', { name: /Renter/i })
    .filter({ hasText: 'Find housing and manage bookings' })
    .click()

  await page.locator('input[type="checkbox"]').first().check()
  await page.getByRole('button', { name: 'Sign up with email', exact: true }).click()

  await page.locator('#su-name').fill(fullName)
  await page.locator('#su-email').fill(email)
  await page.locator('#su-password').fill(password)

  const checkboxes = page.locator('input[type="checkbox"]')
  const count = await checkboxes.count()
  for (let i = 0; i < count; i++) {
    await checkboxes.nth(i).check()
  }

  await page.getByRole('button', { name: 'Sign up with email', exact: true }).click()

  await page.getByRole('heading', { name: 'Check your email' }).waitFor({ state: 'visible' })
}

export async function waitForPostEmailConfirmRenterDestination(page: Page): Promise<void> {
  await expect(page).toHaveURL(POST_EMAIL_CONFIRM_RENTER_PATH, { timeout: 120_000 })
}

/** First interactive renter profile block after email confirm (Stage 1: route deferred to profile). */
export function postEmailConfirmInteractiveLocator(page: Page): Locator {
  return page.getByText('Your situation', { exact: true })
}

/** After callback, role is renter and accommodation route is still unset until situation is chosen. */
export async function assertEmailConfirmCallbackReconciled(
  admin: SupabaseClient,
  userId: string,
): Promise<void> {
  const { data: profile, error: profileErr } = await admin
    .from('student_profiles')
    .select('user_id, accommodation_verification_route')
    .eq('user_id', userId)
    .maybeSingle()
  if (profileErr) throw profileErr
  if (!profile) throw new Error(`student_profiles row missing for ${userId}`)
  if (profile.accommodation_verification_route != null) {
    throw new Error(
      `accommodation_verification_route expected null at email confirm, got ${String(profile.accommodation_verification_route)}`,
    )
  }

  const { data: userData, error: userErr } = await admin.auth.admin.getUserById(userId)
  if (userErr) throw userErr
  const meta = userData.user?.user_metadata ?? {}
  if (!isRenterRole(meta.role)) {
    throw new Error(`user_metadata.role expected renter, got ${String(meta.role)}`)
  }
  if (meta.accommodation_verification_route != null && meta.accommodation_verification_route !== '') {
    throw new Error(
      `user_metadata.accommodation_verification_route expected unset at email confirm, got ${String(meta.accommodation_verification_route)}`,
    )
  }
}

export async function assertEmailConfirmPathReady(
  page: Page,
  admin: SupabaseClient,
  userId: string,
  route: AccommodationRoute,
  getStudentProfileReads: () => number,
  callbackStartMs: number,
): Promise<void> {
  await waitForPostEmailConfirmRenterDestination(page)
  const studentProfileReads = getStudentProfileReads()
  await postEmailConfirmInteractiveLocator(page).waitFor({ state: 'visible' })
  const interactiveMs = Date.now() - callbackStartMs

  console.log(`[e2e email-confirm route=${route}] callback → profile interactive: ${interactiveMs}ms`)
  console.log(
    `[e2e email-confirm route=${route}] student_profiles GETs during /auth/callback: ${studentProfileReads}`,
  )

  expect(studentProfileReads).toBeGreaterThanOrEqual(1)
  expect(studentProfileReads).toBeLessThanOrEqual(3)

  await assertEmailConfirmCallbackReconciled(admin, userId)
}

export async function signInRenter(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login')
  await page.locator('#login-email').fill(email)
  await page.locator('#login-password').fill(password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 60_000 })
}

/** Same login form as renters — destination depends on role. */
export async function signInLandlord(page: Page, email: string, password: string): Promise<void> {
  await signInRenter(page, email, password)
}

/** AppErrorBoundary chrome — must stay absent on page-load smokes. */
export async function assertNoAppErrorBoundary(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { name: 'Something went wrong' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Go to homepage' })).toHaveCount(0)
}
