# Skips Counter — AGI Data Services

A lightweight internal tool for Data Associates (DAs) to report skip events during AGI data annotation tasks. When a DA cannot complete a task — due to corrupt audio, unclear conventions, sensitive content, or other blockers — they submit a skip report through this form. Each submission is written directly to the team manager's Google Sheet, giving managers a real-time, per-DA log of skips, utterances, and reasons without requiring any manual data entry or spreadsheet sharing.

## Live URL

`https://mataarguedas.github.io/skips-counter/`

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| UI Framework | React 18 + Vite 8 | Component rendering and fast dev/build tooling |
| Styling | CSS Variables (Amazon design tokens) | Consistent, themeable UI |
| Forms | react-hook-form | Validation and controlled form state |
| Auth | Google OAuth 2.0 (`@react-oauth/google`) | Identifies the DA via their Google account |
| Data | Google Sheets API v4 | Stores skip events in per-DA tabs |
| Hosting | GitHub Pages | Static deployment via GitHub Actions |

## Local Development Setup

1. Clone the repo:
   ```bash
   git clone https://github.com/mataarguedas/skips-counter.git
   cd skips-counter
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy the env template and fill in your OAuth client ID:
   ```bash
   cp .env.example .env.local
   # Edit .env.local and set VITE_GOOGLE_CLIENT_ID
   ```
4. Start the dev server:
   ```bash
   npm run dev
   ```
5. Open `http://localhost:5173/skips-counter/`

## Adding a New Manager

1. Create a new Google Sheet and copy its Spreadsheet ID from the URL (`/spreadsheets/d/<ID>/`).
2. Add an entry to `src/config/managers.js`:
   ```js
   {
     id: 'newmanager',
     displayName: 'newmanager',
     spreadsheetId: '<paste-id-here>',
     das: ['da_username_1', 'da_username_2'],
   }
   ```
3. Share the Google Sheet with the manager's Google account (Editor access).
4. Push to `main` — the workflow deploys automatically.

## Adding a New DA

No action required. A tab is created automatically in the manager's sheet on the DA's first submission, with the DA's username as the tab name, a formatted header row, and frozen column widths.

To associate a DA with a manager, add their username to the `das` array under the correct manager entry in `src/config/managers.js` and push to `main`.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VITE_GOOGLE_CLIENT_ID` | Yes | OAuth 2.0 Client ID from Google Cloud Console. Used to authenticate DAs via Google Sign-In. |

In local development, set this in `.env.local` (never commit this file).
In production, set it as a repository secret under **Settings → Secrets and variables → Actions** with the name `VITE_GOOGLE_CLIENT_ID`.

## Deployment

Pushing to `main` automatically triggers the GitHub Actions workflow defined in `.github/workflows/deploy.yml`. The workflow:

1. Installs dependencies with `npm ci`
2. Runs `npm run build` with the `VITE_GOOGLE_CLIENT_ID` secret injected
3. Uploads `dist/` as a GitHub Pages artifact
4. Deploys to GitHub Pages

A manual trigger is also available from the **Actions** tab → **Deploy to GitHub Pages** → **Run workflow**.

## OAuth Notes

- **Current setup:** External consent screen with test users added manually in Google Cloud Console (APIs & Services → OAuth consent screen → Test users). Only listed test accounts can sign in.
- **Production path:** To allow all DAs to sign in without manual approval, the OAuth app must be published under Amazon's Google Workspace organization with an Internal consent screen. This requires moving the GCP project into the org or coordinating with IT to register the client ID under the corporate domain.
- **Authorized origins:** The GitHub Pages origin (`https://mataarguedas.github.io`) and any local dev origins (`http://localhost:5173`) must be listed under **Authorized JavaScript origins** in the OAuth 2.0 Client ID settings in Google Cloud Console.
