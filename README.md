# Ironman Coach (PWA)

A small, installable control panel for the coach — the twin of the athlete app (`ironman-athlete`),
built with the same UI. It reads every athlete's published plan and zones from Supabase, shows who is
connected, and sends/reads messages. It is **read-mostly**: it does NOT compute plans, create athletes
or move workouts — all of that stays on the PC webapp (`ironman-planner`).

Vanilla JS, no build step. Offline-first (cache-first boot + IndexedDB cache), like the athlete app.

## Security model

- The app ships only the **public anon key** (`config.js`), exactly like the athlete app.
- A coach sees everyone and can message anyone **only** because they sign in as the coach and the
  `is_coach()` Row-Level-Security policies (migration `0007_coach.sql` in `ironman-planner`) grant it.
- The **service-role key never ships here** — it lives only on the PC (coach bridge `.env`).
- An athlete who signs in here sees the "not a coach" screen (RLS still protects every row).

## Run locally

Serve the folder over http (a service worker needs a secure context; `localhost`/`127.0.0.1` count):

```sh
python3 -m http.server 8787   # then open http://127.0.0.1:8787/
```

Sign in with the coach account (set up once on the PC). First time: use the temporary password, then
change it under **Account → Change password**.

## Keeping it in sync with the athlete app

`styles.css` and `vendor/supabase.js` are kept **byte-identical** to `ironman-athlete` — that is what
keeps the two apps looking the same and running the same Supabase client. Before committing either app:

```sh
tools/check-ui-sync.sh            # defaults to ../ironman-athlete
```

It fails (with a diff) if they have drifted. Coach-only styles live in `coach.css` (not checked), and
the shared JS functions are kept identical by hand (the file was copied from the athlete app).

## Deploy

Static hosting (e.g. GitHub Pages), same as the athlete app. Bump `APP_VERSION` in `app.js` and the
`CACHE` name in `sw.js` on every change so installed clients update. See `CHANGELOG.md`.
