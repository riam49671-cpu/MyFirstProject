#!/usr/bin/env bash
# Öffnet eine Projekt-HTML-Datei in Chrome/Chromium (Standard: Krone index.html).
# Beispiele: ./open-chrome.sh   ./open-chrome.sh runner2.html
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
FILE="${1:-index.html}"
# Kamera braucht http:// — startet Chrome mit lokalem Server.
if [ "$FILE" = "gesichts-studio.html" ] || [ "$FILE" = "simon-says.html" ] || [ "$FILE" = "kamera-app.html" ]; then
  if [ "$FILE" = "simon-says.html" ] && [ -x "$DIR/sofort-simon-says.sh" ]; then
    exec "$DIR/sofort-simon-says.sh"
  fi
  if [ "$FILE" = "gesichts-studio.html" ] && [ -x "$DIR/sofort-gesichts-studio.sh" ]; then
    exec "$DIR/sofort-gesichts-studio.sh"
  fi
  if [ "$FILE" = "kamera-app.html" ] && [ -x "$DIR/sofort-kamera-app.sh" ]; then
    exec "$DIR/sofort-kamera-app.sh"
  fi
  if [ "$FILE" = "lego-spiel.html" ] && [ -x "$DIR/sofort-lego-spiel.sh" ]; then
    exec "$DIR/sofort-lego-spiel.sh"
  fi
fi
URL="file://${DIR}/${FILE}"

echo "Chrome öffnet die Seite — für Musik danach im Fenster „Spiel starten“ / „Los“ drücken." >&2

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

if command -v flatpak >/dev/null 2>&1 && flatpak info com.google.Chrome >/dev/null 2>&1; then
  exec flatpak run com.google.Chrome "$URL"
fi

echo "Chrome/Chromium nicht gefunden. URL:" >&2
echo "  $URL" >&2
xdg-open "$URL" 2>/dev/null || true
