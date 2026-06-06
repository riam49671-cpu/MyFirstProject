#!/usr/bin/env bash
#
# „Erfunden“-Launcher: öffnet eine HTML-Seite im Chrome **sofort im Vollbild**
# (Spielfeld nutzt den ganzen Monitor — Esc beendet meist den Vollbildmodus).
#
# Ohne Argument: **index.html** (Krone-Menü).
# Mit Dateiname: z. B. ./sofort-erfinder-vollbild.sh offline-dino.html
#
# Tipp: Nur den Dateinamen angeben, kein kompletter Pfad nötig.
#
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
RAW="${1:-index.html}"
if [[ "$RAW" == */* ]]; then
  FILE="$(basename "$RAW")"
else
  FILE="$RAW"
fi
URL="file://${ROOT}/${FILE}"

echo "Chrome Vollbild → ${FILE}" >&2
echo "(Esc oder F11 oft zum Verlassen des Vollbilds)" >&2

for chrome in google-chrome-stable google-chrome chromium chromium-browser; do
  if command -v "$chrome" >/dev/null 2>&1; then
    exec "$chrome" --start-fullscreen "$URL"
  fi
done

echo "Chrome/Chromium nicht gefunden. URL:" >&2
echo "  $URL" >&2
xdg-open "$URL" 2>/dev/null || true
