#!/usr/bin/env bash
# Öffnet Snake im Browser (Chrome/Chromium). Standard: snake.html (2 Spieler).
# Beispiele:
#   ./start-snake-chrome.sh
#   ./start-snake-chrome.sh snake1p.html
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
PAGE="${1:-snake.html}"
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

echo "Google Chrome nicht gefunden. Öffne die Datei manuell:" >&2
echo "  $URL" >&2
xdg-open "$URL" 2>/dev/null || true
