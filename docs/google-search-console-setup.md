# Google Search Console (admin Search)

The admin **Search** page (`/admin/search`) calls the **Search Console API** using **OAuth 2.0** with a long-lived **refresh token** (server-side on Vercel). Credentials are **never** committed to git.

**Why OAuth, not a service account?** Same as Unstash: Search Console often cannot add new service accounts as property users. OAuth uses a human Google account that already has access to `sc-domain:quni.com.au`.

## Environment variables (Vercel)

Set all three for **Production** and **Preview**:

| Key | Description |
|-----|-------------|
| `GOOGLE_OAUTH_CLIENT_ID` | OAuth 2.0 Client ID (Web application) |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Client secret |
| `GOOGLE_OAUTH_REFRESH_TOKEN` | Refresh token (typically starts with `1//`) |

Do **not** use `GOOGLE_SEARCH_CONSOLE_SA_KEY` or service-account JSON.

## Property

`sc-domain:quni.com.au`

## Scope

`https://www.googleapis.com/auth/webmasters.readonly` (reads only)

## Setup

Settled configuration is recorded separately (17 Aug 2026). Mirror Unstash `docs/google-search-console-setup.md` if reminting tokens.

## Endpoints

- `GET /api/admin/search-console/summary`
- `GET /api/admin/search-console/queries`
- `GET /api/admin/search-console/pages`

Admin Bearer JWT required. Optional `?refresh=1` bypasses the 1h in-process cache.
