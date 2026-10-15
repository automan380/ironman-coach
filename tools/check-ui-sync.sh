#!/usr/bin/env bash
# Keep the COACH app visually in lock-step with the ATHLETE app.
#
# styles.css and vendor/supabase.js are meant to be BYTE-IDENTICAL in both apps — that is what keeps
# the two PWAs looking the same and running the same Supabase client. Run this before committing either
# app. It prints a diff and exits non-zero if they have drifted. To reconcile, copy the newer file over
# the older one (decide which app changed on purpose), then re-run.
#
# Usage:  tools/check-ui-sync.sh [path-to-ironman-athlete]   (defaults to ../ironman-athlete)
set -u
here="$(cd "$(dirname "$0")/.." && pwd)"
athlete="${1:-$here/../ironman-athlete}"
status=0

if [ ! -d "$athlete" ]; then
  echo "Athlete app not found at: $athlete"
  echo "Pass its path: tools/check-ui-sync.sh /path/to/ironman-athlete"
  exit 2
fi

for f in styles.css vendor/supabase.js; do
  if [ ! -f "$athlete/$f" ]; then echo "MISSING in athlete app: $f"; status=1; continue; fi
  if diff -q "$athlete/$f" "$here/$f" >/dev/null 2>&1; then
    echo "ok: $f identical"
  else
    echo "DRIFT: $f differs from the athlete app --"
    diff "$athlete/$f" "$here/$f" | head -60
    status=1
  fi
done

if [ "$status" -eq 0 ]; then echo "UI in sync."; else echo "UI OUT OF SYNC — reconcile before committing."; fi
exit $status
