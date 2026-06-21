import type { Page } from '@playwright/test'
import type { AccommodationRoute } from './supabaseAdmin'

const ROUTE_CARD_TEXT: Record<AccommodationRoute, string> = {
  student: 'Find housing and manage bookings.',
  non_student: 'Find rooms near university and manage your bookings.',
}

export async function completeEmailSignupUi(
  page: Page,
  route: AccommodationRoute,
  email: string,
  password: string,
  fullName = 'E2E Confirm Test',
): Promise<void> {
  await page.goto('/signup')

  await page
    .locator('button')
    .filter({ hasText: ROUTE_CARD_TEXT[route] })
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
