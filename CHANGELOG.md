# Changelog

All notable changes to the coach app. The version here matches `APP_VERSION` in `app.js` (shown in the
Settings page). Dates are YYYY-MM-DD.

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
