import { test, type Page } from '@playwright/test'
import { getBaseUrl } from './helpers/env'
import {
  createSupabaseAdmin,
  deleteTestUser,
  generateSignupConfirmCallbackUrl,
  type AccommodationRoute,
} from './helpers/supabaseAdmin'
import { assertEmailConfirmPathReady, completeEmailSignupUi } from './helpers/signupUi'

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
      await page.goto(link.confirmUrl, { waitUntil: 'domcontentloaded' })

      await assertEmailConfirmPathReady(
        page,
        admin,
        userId,
        route,
        readCounter.getCount,
        callbackStart,
      )
    } finally {
      readCounter.stop()
      if (userId) {
        await deleteTestUser(admin, userId)
      }
    }
  })
}
