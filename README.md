# Cine Scout

A minimal, dark-mode movie and TV companion for cinephiles. A Mind-Reader
diagnoses your mood through short situational questions and returns 10
must-watch picks with match percentages — every result verified for streaming
in India and Bangladesh, with exact watch steps. A Platform Explorer tracks
the best films on Netflix, Prime Video, Apple TV+, JioHotstar, and Sony LIV.

## Live data, every load

- **Reddit buzz** — fresh mention counts from r/movies, r/TrueFilm,
  r/criterion, r/television, and r/bollywood, plus a live
  "Hot on Reddit now" shelf.
- **Awards** — pulled live from Wikidata on every visit.
- Ratings blend IMDb, critics, subscriber buzz, and live Reddit heat.

Static catalogue values remain as instant display and offline fallback.

## Run it

```bash
cd web
npm install
npm run dev
```

Open `http://localhost:5173/`. Or double-click `Start Cine Scout.command`.

## Environment variables

Set these in Vercel → Project → Settings → Environment Variables, then redeploy
(see `.env.example` for the full list):

- `TMDB_TOKEN` — **required.** TMDB v4 Read Access Token (or `TMDB_API_KEY`, v3).
  Without it every API call answers 503 and the app shows the setup banner.
- `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET` — **optional.** Reddit app-only
  OAuth. Without them the app falls back to the public Arctic Shift archive.

Streaming availability comes from TMDB's watch/providers endpoint (JustWatch
data) — no JustWatch key is used.

## Safety & privacy

- API keys never reach the browser; all third-party calls go through the
  `/api` functions.
- Every `/api` function validates and caps its inputs and rate-limits per IP.
- Security headers (CSP, HSTS, frame/XSS protections) are set in `web/vercel.json`.
- No accounts, no tracking, no cookies — history, taste and dashboard live only
  in the visitor's own browser and can be exported or erased from the dashboard.

## Smoke test

```bash
./web/smoke.sh
```

Builds, serves, and headless-checks the app for startup errors.

## Layout

- `web/` — the app (Vite + React)
- `Sources/` — original native macOS SwiftUI shell
- `Start Cine Scout.command` — one-click starter
