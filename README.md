# Macros — personal calorie & macro tracker PWA

Low-friction daily tracker for a lean bulk. Apple Fitness-style rings for
calories / protein / carbs / fat, quick-add logging from a personal food
list. No food database, no barcode scanner, no login, no backend — by design.

## Run

```sh
npm install
npm run dev       # dev server at http://localhost:5173
npm run build     # type-check + production PWA build into dist/
npm run preview   # serve the production build locally
npm run icons     # regenerate PWA icons into public/icons/
```

## Deploy & install on iPhone

Pushing to `main` builds and deploys to GitHub Pages automatically
(`.github/workflows/deploy.yml`) at `https://tmsvr.github.io/tmsvr-calories/`.
One-time repo setup: **Settings → Pages → Source: GitHub Actions**.

Open the URL in Safari, then **Share → Add to Home Screen**. Updates ship on
next launch automatically.

## Daily use

- **Today tab** — rings show progress vs targets. Pick a serving multiplier
  (defaults to 1, snaps back after each log), tap a food chip to log it.
  Undo from the toast, or delete from the log list. Arrows navigate past days.
- **History tab** — month calendar with mini rings per day; tap a day to
  view or edit its log.
- **Foods tab** — your personal quick-add library: add/edit/delete/reorder.
- **Settings tab** — daily targets, JSON export/import (backup — data lives
  only in this browser, so export occasionally).

## Docs

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — layering rules that keep a
  future Supabase sync and React Native port cheap.
- [docs/MILESTONES.md](docs/MILESTONES.md) — completed milestones + specced
  future work (history view, streaks, Supabase sync, RN port).
