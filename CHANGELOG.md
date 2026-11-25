# Changelog

All notable changes to the coach app. The version here matches `APP_VERSION` in `app.js` (shown in the
Settings page). Dates are YYYY-MM-DD.

## 1.6.0 — 2026-11-25
- **Two measures in every workout target**: the leading one, and the other in brackets — e.g.
  "116–130 bpm (168–228 W)". The coach chooses per athlete which measure leads each sport (bike: heart rate
  or power; run: heart rate or pace; swim: pace).
- **A test counts from its own day**: no more "introduced gradually over 3 weeks" on the Zones page.
- New "What's new" entry (EN/IT). Service-worker cache bumped to `v7`.

## 1.5.0 — 2026-11-25
- **How much the athlete's zones changed.** On the Zones page, under each zone card, the change since the
  previous test of that sport: the threshold before and now, by how much and in %, a big change's weekly
  steps, and every zone before and now. Power and pace are green when better, red when worse; heart rate
  is shown without a colour (a higher threshold heart rate is not by itself an improvement). Published by
  the coach's computer with the zones (Supabase migration `0015` in ironman-planner).
- New "What's new" entry (EN/IT). Service-worker cache bumped to `v6`.

## 1.4.0 — 2026-10-16
- **New "What's new" page.** Settings › **Changelog** (under the version) opens what changed in each
  version, in the language you chose (English or Italian). The in-app text lives in `changes.js` —
  keep it in step with this file.
- **Sync button in the top bar**, right next to "up to date": tap it to sync at any time; it spins while
  it works and the status says how it went. It is no longer in Settings.
- Service-worker cache bumped to `v5`.

## 1.3.0 — 2026-10-16
- **The athlete you are looking at updates by itself.** Every 30 seconds (and when you come back to the
  app) their logs, a session they did on another day (which now moves to that day — Supabase migration
  `0011`) and edits made on your computer are picked up, and the week on screen is redrawn in place.
- **A session the athlete has logged can no longer be moved** (done or skipped): the edit form shows why
  instead of the day picker. To move it, the athlete logs it again on the day they did it. Its length
  and notes can still be changed. (Supabase migration `0013` refuses the move for any app.)
- **Today stands out**: the whole day box is tinted (light or dark theme), not just its name in red.
- Service-worker cache bumped to `v4`.

## 1.2.0 — 2026-10-15
- **Edit a workout from the app.** Open a session and you can now move it to another day, change its
  duration, or add a note — saved straight to the plan, and the athlete gets a "session changed" notice.
  (The plan now lives as a stable, editable record; needs Supabase migration `0010` in ironman-planner.)
- Service-worker cache bumped to `v3`.

## 1.1.0 — 2026-10-15
- **Select and delete messages**, like the athlete app: a Select all / Deselect / Delete toolbar with a
  checkbox on each message. (Needs Supabase migration `0009_coach_message_delete.sql` in ironman-planner,
  which grants the coach permission to delete messages.) Service-worker cache bumped to `v2`.

## 1.0.0 — 2026-10-15
- First version. An installable control-panel PWA for the coach, built as a twin of the athlete app so
  the look is identical.
- **Sign in as the coach** (email + password). A non-coach login is turned away (the "not a coach"
  screen); row-level security protects every athlete's data.
- **Athletes** list (roster) with a live presence dot (green = active in the last 5 minutes).
- Tap an athlete to see their **plan** (week by week, session detail, logged results read-only) and
  their **zones** — all read-only, no recalculation (that stays on the PC).
- **Messages**: send to one athlete or to all, and read athletes' replies.
- Offline-first: the last-synced roster and plans open without a connection; service-worker cache `v1`.
- Shares `styles.css` and the vendored Supabase library with the athlete app, kept identical by
  `tools/check-ui-sync.sh`.
