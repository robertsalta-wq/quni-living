# Cursor Brief — Install Playwright e2e on Unstash (same pattern as Quni)

**Audience:** Unstash Cursor agent / engineer  
**Mode:** Implement  
**Source of truth:** Quni Living (`quni-living`) Playwright setup — copy the *pattern*, not Quni-specific booking/student specs.  
**Do not:** Touch Quni. Work only in the Unstash repo.

---

## Why Quni did this (copy the intent)

Quni did **not** install e2e for generic coverage. It was a **PR gate** for flows that typecheck, unit tests, and lint **cannot see**:

1. **Auth / callback races** — signup → email confirm → `/auth/callback` must land on the right route/role and avoid duplicate profile reads.
2. **Multi-step money / product journeys** — sign-in → uploads / form → DB write. Unit tests of helpers miss broken file inputs, disabled submit gates, storage failures.
3. **Runtime page crashes** — React hooks-order / render throws that pass `tsc` and unit tests but fire an error boundary when the page actually loads.
4. **Against the real Vercel preview** — CI runs Playwright on every PR with `BASE_URL` = preview deployment, not only localhost, so “green CI” means the deployed app works.

**Unstash goal:** Same gate. Pick Unstash’s highest-risk browser paths. Do not port Quni’s booking/student specs unless Unstash has equivalent flows.

---

## Definition of done

1. `@playwright/test` installed; `playwright.config.ts` + `e2e/` helpers + **at least 2** real specs (auth + one critical product path).
2. Local: `npm run test:e2e` works against `npm run dev` (or Unstash’s equivalent) with env secrets from `.env.local` (never committed).
3. CI: on every **pull_request**, an `e2e` job waits for the Vercel preview for that SHA, then runs Playwright with `BASE_URL` = preview URL.
4. GitHub secrets set: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (and any Unstash-specific vars the helpers need).
5. Specs seed + **teardown** test users/rows via Supabase Admin API so the shared DB does not accumulate junk.
6. HTML report uploaded as CI artifact on failure; `playwright-report/` and `test-results/` in `.gitignore`.
7. Optional but recommended: make the `e2e` check required on the PR merge ruleset (same idea as Quni’s protect-main).

---

## Stack to install (mirror Quni)

| Piece | Quni choice | Notes for Unstash |
| --- | --- | --- |
| Runner | `@playwright/test` ^1.61 | Chromium only in CI (`npx playwright install --with-deps chromium`) |
| Config | `playwright.config.ts` at repo root | `testDir: './e2e'`, `workers: 1`, `fullyParallel: false`, long timeouts (120s test / 60s expect) |
| Local base URL | `http://localhost:5173` (Vite) | Change default if Unstash uses another port/framework |
| Local webServer | `npm run dev` when `BASE_URL` unset | Skip webServer when `BASE_URL` is set (CI / remote) |
| Env load | `dotenv` → `.env.vercel` then `.env.local` | Match Unstash’s env file names |
| Scripts | `"test:e2e": "playwright test"` | Add path-specific scripts if useful |
| CI trigger | PRs only (`if: github.event_name == 'pull_request'`) | Don’t run e2e on every push to main unless you want the cost |
| Preview wait | Custom bash polling GitHub Deployments API for the PR SHA | **Do not** use `patrickedqvist/wait-for-vercel-preview` — it filters on `vercel[bot]` and misses redeploys after force-push |

---

## Repo layout to create

```text
playwright.config.ts
e2e/
  helpers/
    env.ts              # BASE_URL, SUPABASE_URL, SERVICE_ROLE_KEY getters (throw if missing)
    supabaseAdmin.ts    # createClient(admin), create/delete users, generateLink for email confirm
    signupUi.ts         # UI helpers: signup clicks, sign-in, assertNoErrorBoundary
  <auth-confirm>.spec.ts
  <critical-journey>.spec.ts
  fixtures/             # small PDF/JPG if uploads are in scope
.github/
  workflows/ci.yml      # add e2e job (or new workflow)
  scripts/wait-for-vercel-preview.sh
```

Ignore:

```gitignore
playwright-report/
test-results/
```

---

## Reference config (adapt ports/scripts)

```ts
// playwright.config.ts — pattern from Quni; change webServer.command / default URL for Unstash
import dotenv from 'dotenv'
import { defineConfig, devices } from '@playwright/test'

dotenv.config({ path: '.env.vercel' })
dotenv.config({ path: '.env.local' })

const baseURL = (process.env.BASE_URL ?? 'http://localhost:5173').replace(/\/$/, '')

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 120_000,
  expect: { timeout: 60_000 },
  use: {
    baseURL,
    trace: 'on-first-retry',
    ...devices['Desktop Chrome'],
  },
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: 'npm run dev', // Unstash: use your real local start command
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
      },
})
```

---

## Helper patterns (required)

### `e2e/helpers/env.ts`

- `getBaseUrl()` from `BASE_URL` or localhost default.
- `getSupabaseUrl()` from `SUPABASE_URL` or `VITE_SUPABASE_URL` (or Unstash’s public env name).
- `getSupabaseServiceRoleKey()` from `SUPABASE_SERVICE_ROLE_KEY` — **never commit**; fail loudly if missing.

### `e2e/helpers/supabaseAdmin.ts`

- `createSupabaseAdmin()` with `auth: { autoRefreshToken: false, persistSession: false }`.
- Create confirmed users via `auth.admin.createUser({ email_confirm: true, ... })` for happy-path sign-in tests.
- For email-confirm path: `auth.admin.generateLink({ type: 'signup', ... })` then open  
  `${base}/auth/callback?token_hash=...&type=signup` (adjust path if Unstash’s callback differs).
- Always `deleteUser` (and delete related rows) in `afterEach` / `finally`.
- Use disposable emails like `e2e+${stamp}@unstash-e2e.invalid` so they never hit real inboxes.

### UI helpers

- Prefer role/label selectors over CSS classes.
- One helper for “error boundary did not fire” (Unstash’s equivalent of Quni’s `AppErrorBoundary` text/UI).
- Keep selectors in helpers so Stage/UI renames are one-file fixes.

---

## Which specs to write first (Unstash — choose real paths)

**Do Task 0 before writing specs:** inventory Unstash’s critical browser paths. Minimum set:

### Spec A — Auth email confirm (always)

Mirror Quni’s `email-confirm-path.spec.ts` intent:

1. Complete signup UI (or admin-create + generateLink if UI signup is flaky).
2. Open confirm/callback URL with `token_hash`.
3. Assert: correct post-login landing URL, correct role/metadata in DB, no error boundary.
4. Optional: count duplicate GETs to the profile table during callback (Quni caught a dedupe bug this way).

### Spec B — Highest-risk product journey (pick one)

Choose the Unstash path that loses money or trust if broken. Examples (replace with real Unstash routes):

- Checkout / subscription / payout onboarding
- Core create → save → publish flow
- Document upload + submit

Pattern from Quni’s `booking-apply`:

1. Admin-seed a ready user (and any prerequisite rows).
2. Sign in via UI.
3. Drive the multi-step UI.
4. Assert UI success **and** a DB row (status, flags, URLs).
5. Teardown.

### Spec C — Page-load crash smoke (strongly recommended)

Mirror Quni’s `booking-review-smoke`:

1. Seed minimal data so the page can render.
2. Sign in → `page.goto` the fragile route(s).
3. Assert key heading visible + **error boundary absent**.

This catches crashes that unit tests never load.

**Do not** start with a 20-spec suite. Ship A + B (+ C if you have a known crashy shell), wire CI, then expand.

---

## CI job shape (required)

Add to Unstash’s GitHub Actions (adapt Node version / package manager):

```yaml
e2e:
  if: github.event_name == 'pull_request'
  runs-on: ubuntu-latest
  permissions:
    contents: read
    deployments: read
    statuses: read
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: "22"
        cache: npm
    - run: npm ci
    - run: npx playwright install --with-deps chromium
    - name: Wait for Vercel preview
      id: vercel_preview
      env:
        GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        SHA: ${{ github.event.pull_request.head.sha }}
        MAX_TIMEOUT: "600"
        CHECK_INTERVAL: "5"
      run: bash .github/scripts/wait-for-vercel-preview.sh
    - name: Run Playwright tests
      run: npx playwright test
      env:
        BASE_URL: ${{ steps.vercel_preview.outputs.url }}
        SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
        VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}   # rename if Unstash uses another public env
        SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
    - if: failure()
      uses: actions/upload-artifact@v4
      with:
        name: playwright-report
        path: playwright-report
```

### Preview wait script (copy pattern)

Implement `.github/scripts/wait-for-vercel-preview.sh` that:

1. Polls `repos/{owner}/{repo}/deployments?sha=$SHA`.
2. For each deployment, finds a **success** status with `environment_url` / `target_url`.
3. Prefers `*.vercel.app` URLs.
4. Writes `url=...` to `$GITHUB_OUTPUT`.
5. Times out after ~600s with a clear error.

**Why custom:** the popular marketplace action filters on creator `vercel[bot]`; after force-push the actor is often the human pusher, so the wait hangs forever.

### Secrets checklist (human — Rob / Unstash owner)

In GitHub repo → Settings → Secrets and variables → Actions:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Confirm Vercel Git integration creates GitHub Deployments for PR previews (the wait script depends on that).

If e2e hits **production** Supabase (same as Quni’s pattern), treat Admin API as powerful: only create/delete users tagged with the e2e email domain; never run destructive SQL inferred from app data.

---

## Implementation order (agent checklist)

1. **Inventory** Unstash auth callback path, error-boundary component name/copy, and top 1–2 money/trust journeys. Write them at the top of the PR description.
2. **Install** `@playwright/test` (+ `dotenv` if missing). Add npm scripts. Add gitignore entries.
3. **Add** `playwright.config.ts` with correct local `webServer` command/port.
4. **Add** `e2e/helpers/env.ts` + `supabaseAdmin.ts` + thin UI helpers.
5. **Write Spec A** (email confirm). Run locally against preview or local + real Supabase.
6. **Write Spec B** (critical journey) with teardown.
7. **Write Spec C** if there is a shell that has crashed before (or a dense authenticated page).
8. **Add** wait script + CI `e2e` job.
9. **Open a PR**; confirm the e2e job waits for preview and goes green.
10. **Optional proof PR** (close without merge): deliberate throw on a smoked page → e2e red, unit/tsc green — proves the gate is real.
11. Ask owner to mark `e2e` required on the branch protection / ruleset.

---

## Guardrails

- **Never commit** service role keys or `.env.local` / `.env.vercel`.
- **Always teardown** users and rows created by the test.
- **workers: 1** until tests are proven isolation-safe (shared listing inventory / rate limits).
- Prefer **role/name** selectors; avoid brittle CSS.
- Do **not** screenshot-diff the whole marketing site; this gate is for auth + product paths.
- Do **not** copy Quni routes (`/student-profile`, `/landlord/bookings/...`) — invent Unstash equivalents only.
- If Unstash has no Supabase Auth, keep Playwright + preview CI, but replace admin helpers with Unstash’s real test-user strategy (still must teardown).

---

## What “same as Quni” means (acceptance)

| Quni behaviour | Unstash must match |
| --- | --- |
| Playwright in `e2e/` | Yes |
| Local + CI via `BASE_URL` | Yes |
| PR CI against Vercel preview | Yes |
| Supabase admin seed/teardown | Yes (if Supabase Auth) |
| Focused critical-path specs, not full coverage | Yes |
| Fail on error-boundary / wrong post-auth landing | Yes |
| Copy booking/student domain tests | No |

---

## Quni files to skim if the Unstash agent has access to this repo

Read-only reference (do not edit):

- `playwright.config.ts`
- `e2e/email-confirm-path.spec.ts`
- `e2e/booking-apply.spec.ts`
- `e2e/booking-review-smoke.spec.ts`
- `e2e/helpers/env.ts`
- `e2e/helpers/supabaseAdmin.ts`
- `e2e/helpers/signupUi.ts`
- `.github/workflows/ci.yml` (`e2e` job)
- `.github/scripts/wait-for-vercel-preview.sh`
- `TECH_DEBT.md` (notes why page-load smoke exists)

If the Unstash agent **cannot** read Quni, this brief alone is enough — implement from the patterns above.

---

## Out of scope for v1

- Mobile / WebKit / Firefox matrix
- Visual regression / Percy
- Full marketing crawl
- Running e2e against production domain on every PR (preview only)
- Porting Quni Vitest `*.e2e.test.ts` PDF raster tests (different tool; only if Unstash has the same PDF problem)

---

## Prompt to paste into Unstash Cursor

```text
Read docs/Cursor-Brief-Unstash-E2E-Playwright.md (or the pasted brief) and implement Playwright e2e using the Quni pattern: config + helpers + auth-confirm spec + one critical Unstash journey + optional page-load crash smoke + GitHub Actions e2e job against Vercel preview with the custom wait-for-vercel-preview.sh (not the marketplace action). Inventory Unstash routes first. Do not invent Quni booking paths. Teardown all seeded users. Open a PR when green locally and CI is wired.
```
