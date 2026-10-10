# Musepark 1.3 — macOS Mind-Reader + Platform Explorer

Native SwiftUI app. Dark mode `#0F0F0F`, sidebar (Mind-Reader / Netflix / Prime / Apple TV+), match-% + IN/BD availability badges.

## Run
1. Open folder in Xcode 15+ (macOS 14 SDK) — or `swift build` / `swift run` (SwiftUI SDK present via Command Line Tools).
2. Copy `.env.example` values to env: `TMDB_API_KEY=...` (mock catalogue used until key set; JustWatch verifier is mocked — swap `JustWatchService` for real API).
3. Region toggle IN/BD in toolbar. History persists to `~/Library/Application Support/Musepark/history.json` + UserDefaults.

## Spec coverage
- **Mind-Reader:** situational proxy Qs (diner / complexity / space / tempo), dynamic Akinator loop (`Engine.swift`: ask-one → recalc → margin check → stop early at 2-4 Qs).
- **Match %:** mood-tag overlap + IMDb/critic prior, 62–99.
- **Anti-repetition:** `HistoryTracker` excludes seen/rejected; reset via ⌘⇧R.
- **Platform Explorer:** bypasses questions, IMDb 8.0+, hidden gems first.
- **Strict IN/BD:** `JustWatchService.verify` — glowing badge `Available on X [IN/BD]`; blocked → red badge + rent/buy fallback or closest-alternative note.
