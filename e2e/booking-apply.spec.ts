import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { test, expect, type Page } from '@playwright/test'
import {
  createConfirmedStudentRenter,
  createSupabaseAdmin,
  deleteTestBooking,
  deleteTestUser,
  findActiveListingPropertyId,
  getStudentProfileId,
  seedStudentProfileForBookingGate,
  waitForStudentProfileDocUrl,
  type StudentVerificationDocUrlColumn,
} from './helpers/supabaseAdmin'
import { signInRenter } from './helpers/signupUi'
import type { SupabaseClient } from '@supabase/supabase-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TEST_DOC_PATH = path.join(__dirname, 'fixtures', 'e2e-test-doc.pdf')
const TEST_ID_IMAGE_PATH = path.join(__dirname, 'fixtures', 'e2e-test-id.jpg')

async function uploadDashboardDoc(
  page: Page,
  admin: SupabaseClient,
  userId: string,
  regionName: RegExp,
  fileInputIndex: number,
  filePath: string,
  profileUrlColumn: StudentVerificationDocUrlColumn,
): Promise<void> {
  const region = page.getByRole('region', { name: regionName })
  const input = region.locator('input[type="file"]').nth(fileInputIndex)
  await input.scrollIntoViewIfNeeded()
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes('/storage/v1/object/student-documents') && response.ok(),
      { timeout: 60_000 },
    ),
    input.setInputFiles(filePath),
  ])
  await expect(page.getByRole('alert').filter({ hasText: 'Upload failed' })).toHaveCount(0)
  await waitForStudentProfileDocUrl(admin, userId, profileUrlColumn)
}

test.describe('booking apply', () => {
  const admin = createSupabaseAdmin()
  let userId: string | null = null
  let bookingId: string | null = null

  test.afterEach(async () => {
    if (bookingId) await deleteTestBooking(admin, bookingId)
    if (userId) await deleteTestUser(admin, userId)
    bookingId = null
    userId = null
  })

  test('student renter uploads doc and submits listing request', async ({ page }) => {
    const email = `e2e+booking+${Date.now()}@quni-e2e.invalid`
    const password = 'E2eBookingPass1!'

    userId = await createConfirmedStudentRenter(admin, email, password)
    const studentProfileId = await getStudentProfileId(admin, userId)
    await seedStudentProfileForBookingGate(admin, userId)
    const propertyId = await findActiveListingPropertyId(admin)

    await signInRenter(page, email, password)
    await page.goto('/student-profile')
    await expect(page.getByText('Government photo ID')).toBeVisible({ timeout: 60_000 })

    await uploadDashboardDoc(page, admin, userId, /02 Verification/, 0, TEST_ID_IMAGE_PATH, 'id_document_url')
    await uploadDashboardDoc(
      page,
      admin,
      userId,
      /02 Verification/,
      1,
      TEST_DOC_PATH,
      'identity_supporting_doc_url',
    )
    await uploadDashboardDoc(
      page,
      admin,
      userId,
      /03 Study & funding/,
      0,
      TEST_DOC_PATH,
      'enrolment_doc_url',
    )
    await expect(page.getByRole('alert').filter({ hasText: 'Upload failed' })).toHaveCount(0)

    const { data: profileAfterUpload, error: profileErr } = await admin
      .from('student_profiles')
      .select('id_document_url, identity_supporting_doc_url, enrolment_doc_url')
      .eq('user_id', userId)
      .single()
    if (profileErr) throw profileErr
    expect(profileAfterUpload?.id_document_url).toBeTruthy()
    expect(profileAfterUpload?.identity_supporting_doc_url).toBeTruthy()
    expect(profileAfterUpload?.enrolment_doc_url).toBeTruthy()

    await page.goto(`/booking/${propertyId}`)
    await expect(page.getByText('Apply')).toBeVisible({ timeout: 60_000 })

    await page.locator('#bk-lease').selectOption('6 months')
    await page.locator('#bk-msg').fill('E2E booking apply test message')
    await page.getByRole('button', { name: 'Continue' }).click()

    await page.locator('input[type="checkbox"]').first().check()
    await page.getByRole('button', { name: 'Submit booking request' }).click()

    await expect(page.getByText('Request submitted', { exact: true }).first()).toBeVisible({
      timeout: 60_000,
    })
    await expect(page.getByRole('alert').filter({ hasText: /Could not|Upload failed/i })).toHaveCount(0)

    const { data: booking, error: bookingErr } = await admin
      .from('bookings')
      .select('id, status, property_id, student_id')
      .eq('student_id', studentProfileId)
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (bookingErr) throw bookingErr
    expect(booking).toBeTruthy()
    expect(booking?.status).toBe('pending_confirmation')
    expect(booking?.student_id).toBe(studentProfileId)
    expect(booking?.property_id).toBe(propertyId)
    bookingId = booking?.id ?? null
  })
})
