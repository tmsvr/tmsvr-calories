# Milestones

Each milestone is self-contained, has explicit acceptance criteria, and can
be handed to an agent with no other context beyond this repo. Read
`docs/ARCHITECTURE.md` first — its layering rules (core = pure TS, UI never
touches storage directly) are hard constraints for every milestone.

Verification for any milestone: `npm run build` must pass (type-check +
production build), and the acceptance criteria must be demonstrated in the
running app (`npm run dev`).

---

## ✅ M0 — Project scaffold (DONE)

Vite + React + TypeScript + vite-plugin-pwa. Folder layout per
ARCHITECTURE.md. `npm run dev` serves the app; `npm run build` produces a
PWA with service worker and manifest.

## ✅ M1 — Core domain + storage (DONE)

- Types: `FoodItem`, `LogEntry` (with macro snapshot), `Targets` in `src/core/types.ts`.
- `DataStore` async interface in `src/core/store.ts`.
- `LocalStorageStore` in `src/storage/localStorageStore.ts`, day-partitioned entries, schema version, seed foods (offered-names ledger — see M8b).
- Domain math in `src/core/calc.ts` (sums, progress fractions), local-day helpers in `src/core/date.ts`.

## ✅ M2 — Rings dashboard (DONE)

- Apple Fitness-style nested SVG rings (outer→inner: calories, protein, carbs, fat) with animated fill and a glow when a ring closes.
- Center shows consumed / target kcal; macro stats row below.

## ✅ M3 — Quick-add logging (DONE)

- Food chip grid; tap = log at selected serving multiplier (½/1/1½/2/3, one-shot, snaps back to 1).
- Undo toast after logging; log list for the day with per-entry delete.
- Day navigation (‹ date ›), future days blocked, tap label to jump to today.

## ✅ M4 — Food library management (DONE)

- Foods tab: add/edit/delete foods (name, emoji, serving label, kcal/P/C/F), reorder with ↑/↓.
- Deleting a food never alters logged history (snapshots).

## ✅ M5 — Targets + backup (DONE)

- Settings tab: edit the four daily targets.
- Export full data as JSON download; import replaces all data (with confirm + schema-version check).

## ✅ M6 — PWA polish (DONE)

- Manifest, generated icons (`npm run icons`), apple-touch-icon, safe-area insets, standalone display, autoUpdate service worker.

---

## ✅ M7 — History calendar (DONE)

- `getEntriesInRange(fromKey, toKey)` on `DataStore`, implemented in `LocalStorageStore`.
- History tab: Monday-first month calendar, each logged day rendered as mini rings (`RingsSvg`, the same component as the dashboard, parameterized by size/stroke). Days without logs show a dashed circle; future days disabled; today outlined.
- Tap a day → opens it on the Today tab for viewing/editing.
- Month grid math lives in `src/core/date.ts` (`monthGrid`, `addMonths`, `monthLabel`).

---

## ✅ M8 — Meals + popularity quick-add (DONE)

- `Meal` entity: named composite of base foods with per-component servings
  (`src/core/types.ts`), macros computed from current foods
  (`mealMacros` in `calc.ts`), logged as ONE snapshot entry.
- Meal CRUD on the Foods tab (`MealForm`): ingredient rows (food select +
  servings), live macro total, warning when a component's food was deleted;
  deleting a base food warns which meals use it.
- Quick-add reworked: top 8 items by usage count (`cal.usage`, maintained by
  `addEntry`/`deleteEntry`), search box over all foods+meals, "All ▾" toggle
  for browsing the rest. Ranking logic in `splitByPopularity` (core).
- Export/import includes `meals` and `usage`; old backups without them
  import fine.

---

## ✅ M8b — Seed ledger, expanded defaults, deployment (DONE)

- Seed foods migrated from a version marker to an **offered-names ledger**
  (`cal.seedsOffered`): each seed is offered once per install, idempotently,
  on every launch. Deleted/renamed seeds never resurrect; seed renames carry
  `aliases`; imports mark all seeds offered. See ARCHITECTURE.md.
- Default library expanded to 33 foods (fruit, tuna, meats, pasta, bread,
  spreads, nuts, dairy, etc. in `src/core/seed.ts`).
- Search bar moved above the top-8 grid and made unconditional.
- GitHub Pages deployment via Actions (`.github/workflows/deploy.yml`):
  push to `main` → build → deploy `dist/`. Vite `base` is
  `/tmsvr-calories/` for builds only (dev stays at `/`).

---

# Future milestones (not started)

## M9 — Trends / averages

**Goal:** numbers on top of the History calendar.

- 7-day and 30-day averages for kcal and protein shown above/below the calendar (math in `src/core/calc.ts`, reuse `getEntriesInRange`).
- Count of "days within calorie target band" for the visible month.

**Accept:** averages match manual calculation; build passes.

## M10 — Streaks / ring-close celebration

**Goal:** make closing rings more satisfying.

- In `core`, add a function computing whether all 4 rings closed for a dateKey (within a tolerance band for calories, e.g. 95–110% counts as closed for kcal; protein ≥100%; fat/carbs 90–115% — confirm bands with the user first).
- Confetti/scale animation when the last ring closes on Today.
- Streak counter ("N days all rings closed") shown under the rings.

**Accept:** streak survives reload; no false trigger when viewing past days.

## M11 — Supabase sync (bolt-on, UI untouched)

**Goal:** optional cloud backup/sync without changing any UI code.

- New `src/storage/supabaseStore.ts` implementing `DataStore`.
- Tables mirror the stored shapes: `targets` (single row per user), `foods`, `meals`, `entries` (indexed on `date_key`), plus usage counts. Use Supabase anon auth or magic link — decide with the user.
- Keep `LocalStorageStore` as offline cache; simplest viable model: local-first writes, background push, pull-on-launch with last-write-wins. Do NOT build conflict UI.
- The only UI change allowed: a Settings section for sign-in/sync status.
- Swap point stays `src/main.tsx`.

**Accept:** existing screens unchanged (git diff proves it, minus Settings); app still fully works offline.

## M12 — React Native port (separate app)

**Goal:** native iOS app reusing `src/core/` verbatim.

- New repo/workspace with Expo. Copy or (better) extract `src/core/` into a shared package.
- Implement `DataStore` over AsyncStorage (or expo-sqlite).
- Rebuild the four screens (Today, History, Foods, Settings) with RN components; rings via `react-native-svg` (the SVG math in `Rings.tsx` transfers almost directly).

**Accept:** `core/` files are byte-identical to the web versions; a JSON export from the web app imports cleanly.

---

# Agent working rules (for anyone picking up a milestone)

1. `src/core/` must stay free of React/DOM/browser imports. If your change needs new logic, put the math in `core`, the rendering in `ui`.
2. UI components never import from `src/storage/` — only `src/main.tsx` chooses the store.
3. Any storage format change bumps `SCHEMA_VERSION` and handles reading the old format (or migrating it) in the store. New default foods are just appended to the seed lists in `src/core/seed.ts` — the offered-names ledger delivers them to existing installs; never add a version marker for seeds.
4. Log entries are immutable history: never recompute their macros from current foods.
5. No new runtime dependencies without a strong reason — the app's value is being small and fast.
6. Verify with `npm run build` plus manually exercising the affected flows in `npm run dev` before calling a milestone done.
