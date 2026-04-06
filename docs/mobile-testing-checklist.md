# Mobile app testing checklist

Use this on **physical devices** (simulators/emulators miss parts of OAuth, push, and payments).

- [ ] **App loads on device** — Cold start from home screen; no white screen or immediate crash.
- [ ] **BrowserRouter deep routes** — Navigate to a nested route (e.g. a detail URL), background the app, return, and **pull to refresh / reload** if the WebView exposes it; confirm **no blank page** and the correct screen renders (native shells should serve `index.html` for SPA routes).
- [ ] **Google OAuth** — Start login, complete Google consent, confirm redirect returns into the app and session is established.
- [ ] **Email / magic link** — Request link from email; open link (or in-app browser flow); confirm return to app and signed-in state.
- [ ] **Push permission** — After login (or wherever you request it), confirm the **system push permission prompt** appears when expected.
- [ ] **Test push + tap** — Send a test notification (e.g. from Firebase Console or your backend); confirm it arrives, and **tapping** opens the app and routes to the intended screen/deep link.
- [ ] **Stripe in WebView** — Complete a payment or setup flow used in production; confirm 3DS / redirects / success and error paths work inside the embedded browser.
- [ ] **Turnstile / Cloudflare** — Trigger a flow that shows the challenge; confirm the **widget renders** and verification completes (no blank iframe, CSP, or network blocks).
