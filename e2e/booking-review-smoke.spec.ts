import { test, expect } from '@playwright/test'
import {
  createConfirmedLandlord,
  createConfirmedStudentRenter,
  createSupabaseAdmin,
  deleteTestBooking,
  deleteTestUser,
  findActiveListingPropertyId,
  getLandlordProfileId,
  getStudentProfileId,
  insertReviewSmokeBooking,
  seedStudentProfileForBookingGate,
  seedStudentVerificationDocsForUnlock,
  type ReviewSmokeBookingStatus,
} from './helpers/supabaseAdmin'
import { assertNoAppErrorBoundary, signInLandlord, signInRenter } from './helpers/signupUi'

/**
 * Page-load smoke for booking review v3 shells.
 * Catches AppErrorBoundary crashes (e.g. React #310 hooks-after-return) that typecheck
 * and unit tests miss because nothing else loads these routes in CI.
 */
test.describe('booking review render smoke', () => {
  const admin = createSupabaseAdmin()
  let landlordUserId: string | null = null
  let studentUserId: string | null = null
  const bookingIds: string[] = []

  test.afterEach(async () => {
    while (bookingIds.length) {
      const id = bookingIds.pop()
      if (id) await deleteTestBooking(admin, id)
    }
    if (studentUserId) await deleteTestUser(admin, studentUserId)
    if (landlordUserId) await deleteTestUser(admin, landlordUserId)
    studentUserId = null
    landlordUserId = null
  })

  async function seedPair(): Promise<{
    landlordEmail: string
    landlordPassword: string
    studentEmail: string
    studentPassword: string
    landlordProfileId: string
    studentProfileId: string
    propertyId: string
  }> {
    const stamp = Date.now()
    const landlordEmail = `e2e+ll+review+${stamp}@quni-e2e.invalid`
    const studentEmail = `e2e+st+review+${stamp}@quni-e2e.invalid`
    const landlordPassword = 'E2eLandlordPass1!'
    const studentPassword = 'E2eStudentPass1!'

    landlordUserId = await createConfirmedLandlord(admin, landlordEmail, landlordPassword)
    studentUserId = await createConfirmedStudentRenter(admin, studentEmail, studentPassword)
    await seedStudentProfileForBookingGate(admin, studentUserId)
    await seedStudentVerificationDocsForUnlock(admin, studentUserId)

    const landlordProfileId = await getLandlordProfileId(admin, landlordUserId)
    const studentProfileId = await getStudentProfileId(admin, studentUserId)
    const propertyId = await findActiveListingPropertyId(admin)

    return {
      landlordEmail,
      landlordPassword,
      studentEmail,
      studentPassword,
      landlordProfileId,
      studentProfileId,
      propertyId,
    }
  }

  async function createBooking(
    propertyId: string,
    studentProfileId: string,
    landlordProfileId: string,
    status: ReviewSmokeBookingStatus,
  ): Promise<string> {
    const id = await insertReviewSmokeBooking(admin, {
      propertyId,
      studentProfileId,
      landlordProfileId,
      status,
    })
    bookingIds.push(id)
    return id
  }

  const statuses: Array<{ status: ReviewSmokeBookingStatus; landlordTitle: RegExp; renterTitle: RegExp }> =
    [
      {
        status: 'pending_confirmation',
        landlordTitle: /Respond to /i,
        renterTitle: /Request sent/i,
      },
      {
        status: 'bond_pending',
        landlordTitle: /Confirm the bond/i,
        renterTitle: /Pay your bond/i,
      },
    ]

  for (const { status, landlordTitle, renterTitle } of statuses) {
    test(`landlord review renders without error boundary (${status})`, async ({ page }) => {
      const pair = await seedPair()
      const bookingId = await createBooking(
        pair.propertyId,
        pair.studentProfileId,
        pair.landlordProfileId,
        status,
      )

      await signInLandlord(page, pair.landlordEmail, pair.landlordPassword)
      await page.goto(`/landlord/bookings/${bookingId}/review`)

      await expect(page.getByText(landlordTitle)).toBeVisible({ timeout: 60_000 })
      await assertNoAppErrorBoundary(page)
      await expect(page).toHaveURL(new RegExp(`/landlord/bookings/${bookingId}/review`))
    })

    test(`renter booking zones render without error boundary (${status})`, async ({ page }) => {
      const pair = await seedPair()
      await createBooking(pair.propertyId, pair.studentProfileId, pair.landlordProfileId, status)

      await signInRenter(page, pair.studentEmail, pair.studentPassword)
      await page.goto('/student-dashboard?tab=bookings')

      await expect(page.getByText(renterTitle)).toBeVisible({ timeout: 60_000 })
      await assertNoAppErrorBoundary(page)
      await expect(page.getByText('E2E booking review smoke message')).toBeVisible()
    })
  }
})
