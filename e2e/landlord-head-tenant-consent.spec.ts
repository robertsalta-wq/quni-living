import { expect, test } from '@playwright/test'
import { createConfirmedLandlord, createSupabaseAdmin, deleteTestUser, getLandlordProfileId } from './helpers/supabaseAdmin'
import { assertNoAppErrorBoundary, signInLandlord } from './helpers/signupUi'

/**
 * Head-tenant consent on publish, unpause, and the live-listing dashboard prompt.
 * Uses a disposable landlord on the linked database. Deletes that landlord's listings
 * and auth user afterwards.
 */
test.describe('landlord head-tenant consent', () => {
  const admin = createSupabaseAdmin()
  const password = 'E2e-HeadTenant-Consent-2026!'
  let userId: string | null = null
  let email = ''

  test.afterEach(async () => {
    if (!userId) return
    const landlordId = await getLandlordProfileId(admin, userId).catch(() => null)
    if (landlordId) {
      await admin.from('properties').delete().eq('landlord_id', landlordId)
    }
    await deleteTestUser(admin, userId)
    userId = null
  })

  test('publish, unpause, and the live prompt record written consent', async ({ page }) => {
    email = `quni-head-tenant-consent-${Date.now()}@mailinator.com`
    userId = await createConfirmedLandlord(admin, email, password, 'E2E Head Tenant')
    const landlordId = await getLandlordProfileId(admin, userId)
    const now = new Date().toISOString()
    const { error: profileErr } = await admin
      .from('landlord_profiles')
      .update({
        landlord_terms_accepted_at: now,
        landlord_service_agreement_version: 'listing-1.1',
        landlord_type: 'individual',
        address: '1 Test Street',
        suburb: 'Auchenflower',
        postcode: '4066',
        state: 'QLD',
      })
      .eq('id', landlordId)
    if (profileErr) throw profileErr

    const head = await insertListing(admin, {
      landlordId,
      title: `E2E head tenant ${Date.now()}`,
      listerRole: 'head_tenant',
      authorityAt: null,
      consentAt: null,
    })
    const owner = await insertListing(admin, {
      landlordId,
      title: `E2E owner ${Date.now()}`,
      listerRole: 'owner',
      authorityAt: now,
      consentAt: null,
    })

    await signInLandlord(page, email, password)
    await page.goto('/landlord/dashboard?tab=listings')
    await assertNoAppErrorBoundary(page)

    await openListingAction(page, head.title, 'Preview')
    await expect(page.getByTestId('head-tenant-consent-no')).toBeVisible()
    await page.getByTestId('head-tenant-consent-no').check()
    await expect(page.getByRole('button', { name: 'Confirm and publish' })).toBeDisabled()
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expectRow(admin, head.id, { status: 'draft', authority: false, consent: false })

    await openListingAction(page, head.title, 'Preview')
    await page.getByTestId('head-tenant-consent-yes').check()
    await page.getByRole('checkbox').check()
    await page.getByRole('button', { name: 'Confirm and publish' }).click()
    await expect(page.getByText('Listing published and now live.')).toBeVisible({ timeout: 30_000 })
    await expectRow(admin, head.id, { status: 'active', authority: true, consent: true })

    await openListingAction(page, owner.title, 'Preview')
    await expect(page.getByTestId('head-tenant-consent-yes')).toHaveCount(0)
    await expectRow(admin, owner.id, { status: 'active', authority: true, consent: false })

    const { error: pauseErr } = await admin.from('properties').update({ status: 'inactive' }).eq('id', head.id)
    if (pauseErr) throw pauseErr
    const { error: clearConsentErr } = await admin
      .from('properties')
      .update({ head_tenant_landlord_consent_at: null })
      .eq('id', head.id)
    if (clearConsentErr) throw clearConsentErr

    await page.goto('/landlord/dashboard?tab=listings')
    await openListingAction(page, head.title, 'Unpause')
    await expect(page.getByTestId('head-tenant-consent-yes')).toBeVisible()
    await expect(page.getByRole('checkbox')).toHaveCount(0)
    await page.getByTestId('head-tenant-consent-yes').check()
    await page.getByRole('button', { name: 'Confirm and unpause' }).click()
    await expectRow(admin, head.id, { status: 'active', authority: true, consent: true })

    const { error: grandfatherErr } = await admin
      .from('properties')
      .update({ head_tenant_landlord_consent_at: null })
      .eq('id', head.id)
    if (grandfatherErr) {
      expect(grandfatherErr.message).toMatch(/consent cannot be cleared/i)
      return
    }
    await page.goto('/landlord/dashboard?tab=listings')
    const prompt = page.getByTestId('head-tenant-consent-prompt')
    await expect(prompt).toBeVisible()
    await expect(prompt).toContainText(head.title)
    await page.getByTestId(`confirm-head-tenant-consent-${head.id}`).click()
    await expect(prompt).toHaveCount(0)
    await expectRow(admin, head.id, { status: 'active', authority: true, consent: true })
  })
})

async function insertListing(
  admin: ReturnType<typeof createSupabaseAdmin>,
  args: {
    landlordId: string
    title: string
    listerRole: 'owner' | 'head_tenant'
    authorityAt: string | null
    consentAt: string | null
  },
): Promise<{ id: string; title: string }> {
  const slug = `e2e-ht-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const { data, error } = await admin
    .from('properties')
    .insert({
      landlord_id: args.landlordId,
      title: args.title,
      slug,
      rent_per_week: 250,
      status: 'draft',
      lister_role: args.listerRole,
      room_type: 'single',
      property_type: 'private_room_landlord_off_site',
      address: '12 Test Street',
      suburb: 'Auchenflower',
      state: 'QLD',
      postcode: '4066',
      images: ['https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=60'],
      authority_to_let_attested_at: args.authorityAt,
      head_tenant_landlord_consent_at: args.consentAt,
    })
    .select('id')
    .single()
  if (error) throw error
  return { id: data.id, title: args.title }
}

async function openListingAction(page: import('@playwright/test').Page, title: string, action: string) {
  await page.getByRole('button', { name: `Actions for ${title}` }).click()
  await page.getByRole('menuitem', { name: action }).click()
}

async function expectRow(
  admin: ReturnType<typeof createSupabaseAdmin>,
  id: string,
  expected: { status: string; authority: boolean; consent: boolean },
) {
  const { data, error } = await admin
    .from('properties')
    .select('status, authority_to_let_attested_at, head_tenant_landlord_consent_at')
    .eq('id', id)
    .single()
  if (error) throw error
  expect(data.status).toBe(expected.status)
  expect(Boolean(data.authority_to_let_attested_at)).toBe(expected.authority)
  expect(Boolean(data.head_tenant_landlord_consent_at)).toBe(expected.consent)
}
