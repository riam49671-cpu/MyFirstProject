#!/usr/bin/env bash
# Lego-Bauplatz als eigenes Fenster (Chrome App-Modus).
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
URL="file://${ROOT}/lego-spiel.html"

echo "Lego-Bauplatz startet …" >&2

for chrome in google-chrome-stable google-chrome; do
  if command -v "$chrome" >/dev/null 2>&1; then
    exec "$chrome" --app="$URL"
  fi
done
if command -v chromium >/dev/null 2>&1; then
  exec chromium --app="$URL"
fi
if command -v chromium-browser >/dev/null 2>&1; then
  exec chromium-browser --app="$URL"
fi
if command -v flatpak >/dev/null 2>&1 && flatpak info com.google.Chrome >/dev/null 2>&1; then
  exec flatpak run com.google.Chrome --app="$URL"
fi

echo "Chrome nicht gefunden. URL: $URL" >&2
xdg-open "$URL" 2>/dev/null || true
