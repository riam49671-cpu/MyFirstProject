#!/usr/bin/env bash
# Lego-Stapel — lokaler Server + Chrome (Flatpak kann kein file:// aus dem Ordner).
set -e
PORT=8774
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

port_open() {
  timeout 0.12 bash -c "echo >/dev/tcp/127.0.0.1/$PORT" 2>/dev/null
}

open_chrome() {
  local url="$1"
  if command -v flatpak >/dev/null 2>&1 && flatpak info com.google.Chrome >/dev/null 2>&1; then
    exec flatpak run com.google.Chrome --app="$url"
  fi
  for chrome in google-chrome-stable google-chrome; do
    if command -v "$chrome" >/dev/null 2>&1; then
      exec "$chrome" --app="$url"
    fi
  done
  if command -v chromium >/dev/null 2>&1; then
    exec chromium --app="$url"
  fi
  if command -v chromium-browser >/dev/null 2>&1; then
    exec chromium-browser --app="$url"
  fi
  echo "Chrome nicht gefunden. Öffne im Browser: $url" >&2
  xdg-open "$url" 2>/dev/null || true
}

if ! port_open; then
  python3 -m http.server "$PORT" --bind 127.0.0.1 >/dev/null 2>&1 &
  echo $! >"$DIR/.lego-spiel-server.pid"
  for _ in $(seq 1 40); do
    port_open && break
    sleep 0.05
  done
fi

echo "Lego-Stapel startet …" >&2
URL="http://127.0.0.1:$PORT/lego-spiel.html"
open_chrome "$URL"
