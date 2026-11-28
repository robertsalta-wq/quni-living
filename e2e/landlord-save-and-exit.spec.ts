import { expect, test } from '@playwright/test'
import { createConfirmedLandlord, createSupabaseAdmin, deleteTestUser, getLandlordProfileId } from './helpers/supabaseAdmin'

/**
 * Save and exit on a new listing must stay on the form until a draft row exists,
 * then the listings tab must show that draft.
 */
test.describe('landlord save and exit', () => {
  const admin = createSupabaseAdmin()
  const password = 'E2e-Save-And-Exit-2026!'
  let userId: string | null = null

  test.afterEach(async () => {
    if (!userId) return
    const landlordId = await getLandlordProfileId(admin, userId).catch(() => null)
    if (landlordId) await admin.from('properties').delete().eq('landlord_id', landlordId)
    await deleteTestUser(admin, userId)
    userId = null
  })

  test('stays on the form until title, state, address, and rent are saved', async ({ page }) => {
    const email = `e2e+save-exit+${Date.now()}@quni-e2e.invalid`
    const title = `E2E save exit ${Date.now()}`
    userId = await createConfirmedLandlord(admin, email, password, 'E2E Save Exit')
    const landlordId = await getLandlordProfileId(admin, userId)

    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/login', { waitUntil: 'networkidle' })
    await page.locator('#login-email').fill(email)
    await page.locator('#login-password').fill(password)
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 60_000 })

    await page.goto('/landlord/property/new')
    await page.getByRole('button', { name: 'Save and exit' }).click()
    await expect(page).toHaveURL(/\/landlord\/property\/new/)
    await expect(page.getByText('Title is required.')).toBeVisible()
    const { count: beforeCount, error: beforeErr } = await admin
      .from('properties')
      .select('id', { count: 'exact', head: true })
      .eq('landlord_id', landlordId)
    if (beforeErr) throw beforeErr
    expect(beforeCount).toBe(0)

    await page.locator('#pf-title').fill(title)
    const location = page.locator('#section-location')
    await location.getByRole('button', { name: 'Enter address manually' }).click()
    await location.locator('#pf-addr').fill('244 Buffalo Road')
    await location.locator('#pf-suburb').fill('Ryde')
    await location.locator('#pf-state').selectOption('NSW')
    await location.locator('#pf-pc').fill('2112')
    const confirm = page.waitForResponse(
      (res) => res.url().includes('/api/places') && res.url().includes('confirm=1'),
      { timeout: 30_000 },
    )
    await location.locator('#confirm-address').click()
    const confirmResponse = await confirm
    expect(confirmResponse.status(), await confirmResponse.text()).not.toBe(401)
    await expect(location.getByRole('button', { name: 'Edit' })).toBeVisible()

    await page.locator('#pf-rent').fill('250')
    await page.getByRole('button', { name: 'Save and exit' }).click()
    await page.waitForURL(/\/landlord\/dashboard/, { timeout: 30_000 })
    await expect(page.getByText('Draft').first()).toBeVisible()
    await expect(page.getByText(/Buffalo Road/)).toBeVisible()

    const { count: afterCount, error: afterErr } = await admin
      .from('properties')
      .select('id, status', { count: 'exact' })
      .eq('landlord_id', landlordId)
      .eq('status', 'draft')
    if (afterErr) throw afterErr
    expect(afterCount).toBe(1)
  })
})
