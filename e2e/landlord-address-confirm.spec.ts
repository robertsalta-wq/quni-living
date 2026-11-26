import { expect, test } from '@playwright/test'
import { createConfirmedLandlord, createSupabaseAdmin, deleteTestUser, getLandlordProfileId } from './helpers/supabaseAdmin'

/**
 * Signed-in landlord confirms a Google suggestion and a typed address on the Preview.
 * Both used to 401 after local JWT verification rejected ECC (P-256) access tokens.
 */
test.describe('landlord address confirm', () => {
  const admin = createSupabaseAdmin()
  const password = 'E2e-Address-Confirm-2026!'
  let userId: string | null = null

  test.afterEach(async () => {
    if (!userId) return
    const landlordId = await getLandlordProfileId(admin, userId).catch(() => null)
    if (landlordId) await admin.from('properties').delete().eq('landlord_id', landlordId)
    await deleteTestUser(admin, userId)
    userId = null
  })

  test('confirms a Google suggestion and a manual address', async ({ page }) => {
    const email = `e2e+address+${Date.now()}@quni-e2e.invalid`
    userId = await createConfirmedLandlord(admin, email, password, 'E2E Address')

    await page.goto('/login', { waitUntil: 'networkidle' })
    await page.locator('#login-email').fill(email)
    await page.locator('#login-password').fill(password)
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 60_000 })

    await page.goto('/landlord/property/new')
    const location = page.locator('#section-location')
    const search = location.locator('#pf-address-search')
    await expect(search).toBeVisible()

    const suggestions = page.waitForResponse(
      (res) => res.url().includes('/api/places') && res.url().includes('input='),
      { timeout: 30_000 },
    )
    await search.fill('244 Buffalo Road Ryde')
    const suggestionResponse = await suggestions
    expect(suggestionResponse.status(), await suggestionResponse.text()).toBe(200)
    const option = location.locator('#pf-address-suggestions [role="option"]').filter({ hasText: /Buffalo/i }).first()
    await expect(option).toBeVisible()
    await option.click()
    await expect(location.getByRole('button', { name: 'Edit' })).toBeVisible()
    await expect(location.getByText('Sign in again')).toHaveCount(0)

    const street = (await location.locator('p.font-semibold').first().innerText()).trim()
    const locality = (await location.locator('p.font-semibold + p').first().innerText()).trim()
    const parsed = locality.match(/^(.*)\s+(NSW|QLD|VIC|WA|SA|TAS|ACT|NT)\s+(\d{4})$/)
    expect(parsed, locality).not.toBeNull()
    const [, suburb, state, postcode] = parsed ?? []

    await location.getByRole('button', { name: 'Clear' }).click()
    await location.getByRole('button', { name: 'Enter address manually' }).click()
    await location.locator('#pf-addr').fill(street)
    await location.locator('#pf-suburb').fill(suburb ?? '')
    await location.locator('#pf-state').selectOption(state ?? '')
    await location.locator('#pf-pc').fill(postcode ?? '')

    const confirm = page.waitForResponse(
      (res) => res.url().includes('/api/places') && res.url().includes('confirm=1'),
      { timeout: 30_000 },
    )
    await location.locator('#confirm-address').click()
    const confirmResponse = await confirm
    expect(confirmResponse.status(), await confirmResponse.text()).not.toBe(401)
    await expect(location.getByRole('button', { name: 'Edit' })).toBeVisible()
    await expect(page.getByText('Sign in again to confirm this address.')).toHaveCount(0)
  })
})
