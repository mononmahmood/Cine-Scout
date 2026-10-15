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

## Smoke test

```bash
./web/smoke.sh
```

Builds, serves, and headless-checks the app for startup errors.

## Layout

- `web/` — the app (Vite + React)
- `Sources/` — original native macOS SwiftUI shell
- `Start Cine Scout.command` — one-click starter
