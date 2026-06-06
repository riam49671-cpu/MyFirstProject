#!/usr/bin/env bash
# Öffnet Neon-Sprinter in Chrome. Optional: Dateiname (Standard: runner.html).
#   ./start-runner-chrome.sh runner2.html
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
PAGE="${1:-runner.html}"
URL="file://${DIR}/${PAGE}"

for chrome in google-chrome-stable google-chrome; do
  if command -v "$chrome" >/dev/null 2>&1; then
    exec "$chrome" "$URL"
  fi
done

if command -v chromium >/dev/null 2>&1; then
  exec chromium "$URL"
fi
if command -v chromium-browser >/dev/null 2>&1; then
  exec chromium-browser "$URL"
fi

echo "Google Chrome nicht gefunden. Öffne die Datei manuell in Chrome:" >&2
echo "  $URL" >&2
xdg-open "$URL" 2>/dev/null || true
