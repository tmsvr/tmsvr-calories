# Architecture

Personal macro/calorie tracker PWA. No backend, no login. Data lives in
localStorage on the device.

## Layers

```
src/
  core/       Pure TypeScript. NO React, NO DOM, NO browser APIs
              (except optional crypto.randomUUID feature-detect in id.ts).
              Types, domain math, date helpers, the DataStore interface,
              seed data. Copied verbatim into a future React Native app.

  state/      React but NO DOM/browser APIs. appState.tsx: the single
              context/provider holding targets, foods, meals, usage, the
              selected day and its entries. Also reused verbatim in a
              React Native app — anything added here must stay free of
              document/window/localStorage/Blob etc.

  storage/    DataStore implementations. Currently LocalStorageStore
              (web). An RN app adds an AsyncStorage/SQLite one; Supabase
              sync wraps a local store (see below).

  ui/         React DOM. Web-only rendering: screens, components, CSS.
              Talks ONLY to state/ and core/ — never to storage/.
```

Dependency direction: `ui → state → core` and `main.tsx → storage → core`.
`main.tsx` is the only file that touches `storage/`.

## Supabase integration plan (backend, database, auth)

The rule that makes this cheap: **Supabase is a sync layer, not a store
replacement.** Do NOT point the UI at a network-backed DataStore — that
breaks offline use and forces error handling into every screen.

- `SyncedStore implements DataStore` in `src/storage/`, wrapping
  `LocalStorageStore` (or the RN store). Reads always serve local data.
  Writes go local-first, then enqueue an op (upsert/delete + entity + id)
  in a persisted outbox that is pushed to Supabase in the background;
  deletions propagate as ops, so no tombstone columns are needed locally.
- Pull on launch/foreground; conflict resolution is last-write-wins using
  the `updatedAt` stamp that `LocalStorageStore` already writes on every
  food/meal/targets mutation (entries are immutable — insert/delete only).
- Tables mirror the stored shapes 1:1 (`foods`, `meals`, `entries` keyed
  by the existing UUID ids, `targets` single row per user), each with a
  `user_id` column and row-level security `user_id = auth.uid()`.
  `ExportedData` doubles as the initial-upload payload for migrating a
  device's existing data into a fresh account.
- Auth is NOT part of `DataStore` (keep it data-only). Add a separate
  small interface (e.g. `AuthProvider`: signIn/signOut/currentUser/
  onChange) implemented against supabase-js; only Settings talks to it.
- Swap point stays `src/main.tsx`: construct local store, wrap in
  `SyncedStore` when the user has signed in.

## React Native plan

`core/` and `state/` move as-is (both are verified free of DOM/browser
APIs). The RN app implements `DataStore` over AsyncStorage or expo-sqlite,
injects it into `AppStateProvider` exactly like `main.tsx` does, and
rebuilds only `ui/` (rings via react-native-svg — the SVG math in
`Rings.tsx` transfers almost directly). JSON export/import moves data
between web and native.

## Data model decisions

- **Log entries snapshot macros** (`perServing` copied from the food at
  log time). Editing or deleting a food never changes past days. Entries
  are immutable: created and deleted, never edited.
- **Mutable records carry `updatedAt`** (foods, meals, targets), stamped
  by the store on every write — UI code never sets it. This is the
  last-write-wins key for future sync.
- **Meals are composites of foods** (`components: {foodId, servings}[]`).
  Their macros are computed from the CURRENT food definitions when
  displayed and when logged (then snapshotted into the entry). A meal
  logs as ONE entry. Components whose food was deleted are skipped.
- **Usage counts** (`cal.usage`) are maintained by `addEntry`/`deleteEntry`
  and drive the top-8 quick-add ranking; they are approximate by design
  (a cleared history via import replaces them wholesale).
- **Seed foods use an offered-names ledger, not a version marker.** On every
  launch the store offers each seed in `src/core/seed.ts` exactly once per
  install (tracked in `cal.seedsOffered`). To add default foods, just append
  to the seed lists — existing installs pick them up next launch. Deleted or
  renamed seeds are never resurrected (their names stay in the ledger), and
  seed renames carry an `aliases` list so old installs aren't re-offered the
  same food under its new name. Importing a backup marks all seeds offered.
- **Entries are partitioned by day** in localStorage
  (`cal.entries.<YYYY-MM-DD>`), so reading a day is O(that day), not
  O(all history).
- **`dateKey` is the local calendar day** (`YYYY-MM-DD`), never UTC —
  a meal at 23:30 belongs to the day the user experienced.
- **`schemaVersion`** is stored in `cal.meta` and embedded in exports;
  future format changes get a migration keyed off it.

## localStorage layout

| Key | Value |
| --- | --- |
| `cal.meta` | `{ schemaVersion: 1 }` |
| `cal.targets` | `Targets` |
| `cal.foods` | `FoodItem[]` |
| `cal.meals` | `Meal[]` (composites referencing foods by id) |
| `cal.usage` | `Record<foodOrMealId, timesLogged>` — popularity ranking |
| `cal.seedsOffered` | lowercase names of seed foods already offered once |
| `cal.entries.<dateKey>` | `LogEntry[]` for that day |

## PWA

`vite-plugin-pwa` with `registerType: "autoUpdate"` — a new deploy is
picked up on next launch without user action. Icons are generated by
`npm run icons` (`scripts/generate-icons.mjs`, dependency-free PNG
encoder). iOS install: Safari → Share → Add to Home Screen.
