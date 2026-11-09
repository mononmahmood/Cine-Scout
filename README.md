# Cine Scout

A dark-mode movie and TV companion for people who care about what they watch. Cine Scout’s **Mind-Reader** asks a few situational questions about your mood and returns 10 picks with match percentages—each checked for streaming availability in India and Bangladesh, with clear steps on where to watch. The **Platform Explorer** highlights strong films on Netflix, Prime Video, Apple TV+, JioHotstar, and Sony LIV.

## Live data

- **Reddit buzz** — mention counts from r/movies, r/TrueFilm, r/criterion, r/television, and r/bollywood, plus a “Hot on Reddit now” shelf.
- **Awards** — pulled live from Wikidata on each visit.
- Ratings blend IMDb, critics, subscriber buzz, and live Reddit heat.

Static catalogue values are kept as instant display and offline fallback.

## Run locally

```bash
cd web
npm install
npm run dev
```

Open `http://localhost:5173/`. You can also double-click `Start Cine Scout.command`.

## Environment variables

Set these in Vercel → Project → Settings → Environment Variables, then redeploy (see `.env.example` for the full list):

- `TMDB_TOKEN` — **required.** TMDB v4 Read Access Token (or `TMDB_API_KEY`, v3). Without it, API calls return 503 and the app shows a setup banner.
- `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET` — **optional.** Reddit app-only OAuth. Without them, the app falls back to the public Arctic Shift archive.

Streaming availability comes from TMDB’s watch/providers endpoint (JustWatch data). No separate JustWatch key is used.

## Safety and privacy

- API keys never reach the browser; third-party calls go through the `/api` functions.
- Each `/api` function validates and caps inputs and applies per-IP rate limits.
- Security headers (CSP, HSTS, frame/XSS protections) are set in `web/vercel.json`.
- No accounts, no tracking, no cookies. History, taste, and dashboard data stay in the visitor’s browser and can be exported or erased from the dashboard.

## Smoke test

```bash
./web/smoke.sh
```

Builds, serves, and runs a headless check for startup errors.

## Project layout

- `web/` — web app (Vite + React)
- `Sources/CineScout/` — native macOS SwiftUI shell
- `Start Cine Scout.command` — one-click starter
