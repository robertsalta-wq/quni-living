import { test, expect, type Page } from '@playwright/test'
import { getBaseUrl } from './helpers/env'
import {
  assertStudentProfileReconciled,
  createSupabaseAdmin,
  deleteTestUser,
  generateSignupConfirmCallbackUrl,
  type AccommodationRoute,
} from './helpers/supabaseAdmin'
import { completeEmailSignupUi } from './helpers/signupUi'

const ROUTES: AccommodationRoute[] = ['student', 'non_student']

function isStudentProfilesRead(url: string, method: string): boolean {
  return method === 'GET' && /\/rest\/v1\/student_profiles(?:\?|$)/.test(url)
}

function attachCallbackStudentProfileReadCounter(page: Page): {
  getCount: () => number
  stop: () => void
} {
  let counting = false
  let count = 0

  const onRequest = (request: { url: () => string; method: () => string }) => {
    if (!counting) return
    if (isStudentProfilesRead(request.url(), request.method())) count += 1
  }

  const onFrameNavigated = (frame: { url: () => string; page: () => Page }) => {
    if (frame.page() !== page) return
    const url = frame.url()
    if (url.includes('/auth/callback')) {
      counting = true
    } else if (counting && !url.includes('/auth/callback')) {
      counting = false
    }
  }

  page.on('request', onRequest)
  page.on('framenavigated', onFrameNavigated)

  return {
    getCount: () => count,
    stop: () => {
      page.off('request', onRequest)
      page.off('framenavigated', onFrameNavigated)
    },
  }
}

function onboardingInteractiveLocator(page: Page, route: AccommodationRoute) {
  if (route === 'student') {
    return page.getByRole('heading', { name: 'Verify your university email' })
  }
  return page.getByRole('heading', { name: 'About you' })
}

for (const route of ROUTES) {
  test(`email confirm (${route}): single deduped profile read and route/role reconciliation`, async ({
    page,
  }) => {
    const baseURL = getBaseUrl()
    const admin = createSupabaseAdmin()
    const email = `e2e+${route}+${Date.now()}@quni-e2e.invalid`
    const password = 'E2eConfirmPass1!'
    let userId: string | null = null

    const readCounter = attachCallbackStudentProfileReadCounter(page)

    try {
      await completeEmailSignupUi(page, route, email, password)

      const link = await generateSignupConfirmCallbackUrl(admin, email, password, baseURL)
      userId = link.userId

      const callbackStart = Date.now()
      await page.goto(link.confirmUrl)

      await expect(page).toHaveURL(/\/onboarding\/student/)
      const interactive = onboardingInteractiveLocator(page, route)
      await interactive.waitFor({ state: 'visible' })
      const interactiveMs = Date.now() - callbackStart

      const studentProfileReads = readCounter.getCount()
      console.log(
        `[e2e email-confirm route=${route}] callback → onboarding interactive: ${interactiveMs}ms`,
      )
      console.log(
        `[e2e email-confirm route=${route}] student_profiles GETs during /auth/callback: ${studentProfileReads}`,
      )

      expect(studentProfileReads).toBe(1)

      await assertStudentProfileReconciled(admin, userId, route)
    } finally {
      readCounter.stop()
      if (userId) {
        await deleteTestUser(admin, userId)
      }
    }
  })
}
