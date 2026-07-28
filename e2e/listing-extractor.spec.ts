import { test, expect } from '@playwright/test'
import { createConfirmedLandlord, createSupabaseAdmin, deleteTestUser } from './helpers/supabaseAdmin'
import { assertNoAppErrorBoundary, signInLandlord } from './helpers/signupUi'

/**
 * Listing paste extractor — mocked AI route (no Anthropic call).
 * Asserts: pre-fill + forced accommodation choice before publish.
 */
test.describe('listing paste extractor', () => {
  const admin = createSupabaseAdmin()
  let landlordUserId: string | null = null

  test.afterEach(async () => {
    if (landlordUserId) await deleteTestUser(admin, landlordUserId)
    landlordUserId = null
  })

  test('paste → review draft → publish blocked without accommodation; succeeds after choice', async ({
    page,
  }) => {
    const stamp = Date.now()
    const email = `e2e+ll+extract+${stamp}@quni-e2e.invalid`
    const password = 'E2eLandlordPass1!'
    landlordUserId = await createConfirmedLandlord(admin, email, password)

    await page.route('**/api/ai/extract-listing', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          extracted: {
            title: { value: 'E2E Extracted Room Kensington', confidence: 'high' },
            description: { value: 'Nice room near campus, wifi included.', confidence: 'high' },
            rentPerWeek: { value: '295', confidence: 'high' },
            bedrooms: { value: '3', confidence: 'low' },
            bathrooms: { value: '1', confidence: 'low' },
            maxOccupants: null,
            furnished: { value: true, confidence: 'high' },
            linenSupplied: null,
            weeklyCleaning: null,
            features: { value: ['WiFi'], confidence: 'high' },
            parkingAvailable: null,
            address: null,
            suburb: { value: 'Kensington', confidence: 'high' },
            state: { value: 'NSW', confidence: 'high' },
            postcode: { value: '2033', confidence: 'high' },
            leaseLength: null,
            availableFrom: null,
            houseRulesText: null,
            accommodationHint: { value: 'reads like a private room', confidence: 'low' },
          },
          unmatchedFeatureNames: [],
        }),
      })
    })

    await signInLandlord(page, email, password)
    await page.goto('/landlord/property/new')
    await assertNoAppErrorBoundary(page)

    await expect(page.getByTestId('listing-paste-extractor')).toBeVisible({ timeout: 30_000 })
    await page.getByTestId('listing-paste-textarea').fill(
      'Room for rent Kensington near UNSW $295/week wifi furnished 3 bed house',
    )
    await page.getByTestId('listing-paste-submit').click()

    await expect(page.getByTestId('accommodation-unset-banner')).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('#pf-title')).toHaveValue('E2E Extracted Room Kensington')
    await expect(page.locator('#pf-rent')).toHaveValue('295')

    // Attempt publish without choosing accommodation
    await page.getByRole('button', { name: /Publish listing|Save listing/i }).click()
    await expect(page.locator('#listing-form-feedback-top')).toContainText(/Choose how this is let/i)

    // Choose accommodation card
    await page.getByRole('button', { name: /A room in my home/i }).click()
    await expect(page.getByTestId('accommodation-unset-banner')).toHaveCount(0)

    // Accommodation guardrail cleared — further validation may still block full publish
    await page.getByRole('button', { name: /Publish listing|Save listing/i }).click()
    const topAlert = page.locator('#listing-form-feedback-top')
    if (await topAlert.isVisible()) {
      await expect(topAlert).not.toContainText(/Choose how this is let/i)
    }
  })

  test('paste → attempt publish without accommodation stays blocked', async ({ page }) => {
    const stamp = Date.now()
    const email = `e2e+ll+extract2+${stamp}@quni-e2e.invalid`
    const password = 'E2eLandlordPass1!'
    landlordUserId = await createConfirmedLandlord(admin, email, password)

    await page.route('**/api/ai/extract-listing', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          extracted: {
            title: { value: 'Blocked Without Tier', confidence: 'high' },
            description: null,
            rentPerWeek: { value: '200', confidence: 'high' },
            bedrooms: null,
            bathrooms: null,
            maxOccupants: null,
            furnished: null,
            linenSupplied: null,
            weeklyCleaning: null,
            features: null,
            parkingAvailable: null,
            address: null,
            suburb: { value: 'Sydney', confidence: 'high' },
            state: { value: 'NSW', confidence: 'high' },
            postcode: null,
            leaseLength: null,
            availableFrom: null,
            houseRulesText: null,
            accommodationHint: null,
          },
          unmatchedFeatureNames: [],
        }),
      })
    })

    await signInLandlord(page, email, password)
    await page.goto('/landlord/property/new')
    await page.getByTestId('listing-paste-textarea').fill('Room $200 Sydney CBD available now wifi')
    await page.getByTestId('listing-paste-submit').click()
    await expect(page.getByTestId('choose-how-let-prompt')).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: /Publish listing|Save listing/i }).click()
    await expect(page.locator('#listing-form-feedback-top')).toContainText(/Choose how this is let/i)
  })
})
