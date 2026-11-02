# GA Raw Explorer

**Live demo:** https://tag-crux.github.io/ga-raw-explorer/

Browse **raw Google Analytics 4 data** from every account and property you have access to, right in your browser.

Pick a property, choose any dimensions and metrics (including custom definitions), set a date range and get the
result as a sortable table, raw JSON, CSV or JSON export.

> **Privacy by design:** there is no backend, no database and no analytics. The app talks directly from your browser
> to Google's APIs with a short-lived, read-only access token that is kept in memory only and revoked on sign-out.

## Features

- Sign in with Google (OAuth 2.0, `analytics.readonly` scope)
- Lists all GA4 accounts and properties of the signed-in user (Admin API `accountSummaries`)
- Loads property-specific dimensions & metrics, including custom dimensions/metrics (Data API `getMetadata`)
- Live compatibility check of the selected fields (Data API `checkCompatibility`)
- Runs reports (Data API `runReport`) with date presets, server-side paging up to 100k rows per page
- Client-side sort and filter, CSV / JSON export, request & response JSON view
- Shows remaining daily property quota
- Light / dark theme, responsive layout

## Tech stack

React 19 · TypeScript · Vite · Google Identity Services · Google Analytics Admin API v1beta & Data API v1beta.
No UI or table libraries, no server.

## Architecture

```
Browser ──(GIS token client, popup)──▶ Google OAuth ──▶ access token (memory only)
   │
   ├──▶ analyticsadmin.googleapis.com  /v1beta/accountSummaries
   └──▶ analyticsdata.googleapis.com   /v1beta/properties/{id}/metadata | :checkCompatibility | :runReport
```

## Getting started

### 1. Google Cloud setup

1. Create (or pick) a project in [Google Cloud Console](https://console.cloud.google.com/).
2. **APIs & Services → Library**: enable **Google Analytics Admin API** and **Google Analytics Data API**.
3. **Google Auth Platform → Branding / Audience**: configure the consent screen (External).
   While the app is in *Testing* mode, add your Google account(s) under **Test users**.
4. **Data Access**: add the scope `https://www.googleapis.com/auth/analytics.readonly`.
5. **Clients → Create client → Web application**. Under **Authorized JavaScript origins** add every origin you
   will open the app from, e.g.
   - `http://localhost:5173` (dev server)
   - `https://<your-user>.github.io` (GitHub Pages)

   No redirect URI is needed (the token model uses a popup).

> Google only accepts `http://localhost` or HTTPS domains as origins. Raw IP addresses such as
> `http://192.168.x.x` are rejected; use an SSH tunnel to `localhost` or a domain with HTTPS instead.

### 2. Run locally

```bash
npm install
cp .env.example .env.local   # then paste your Client ID
npm run dev                  # http://localhost:5173
```

### 3. Deploy to GitHub Pages

1. Repository **Settings → Pages → Source: GitHub Actions**.
2. **Settings → Secrets and variables → Actions → Variables**: add `VITE_GOOGLE_CLIENT_ID`.
3. Push to `main`; the workflow in `.github/workflows/deploy.yml` builds and publishes `dist/`.

The build uses relative asset paths, so it works under any sub-path.

## Limits

- Max 9 dimensions and 10 metrics per request (GA4 Data API limit).
- Requests consume [GA4 property quota tokens](https://developers.google.com/analytics/devguides/reporting/data/v1/quotas).
- `analytics.readonly` is a *sensitive* scope: for a public production launch the OAuth app needs Google verification;
  until then only test users can sign in.

## Roadmap

- Dimension / metric filters and multiple date ranges
- Realtime report (`runRealtimeReport`)
- Shareable query URL (query only, no data)

## License

[MIT](LICENSE)
