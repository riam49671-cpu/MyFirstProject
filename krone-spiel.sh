#!/usr/bin/env bash
# Lokaler Server (8765) + Chrome auf Krone-Spiel — möglichst sofort.
set -e
PORT=8765
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

port_open() {
  timeout 0.12 bash -c "echo >/dev/tcp/127.0.0.1/$PORT" 2>/dev/null
}

if port_open; then
  echo "Server läuft schon auf Port $PORT." >&2
else
  python3 -m http.server "$PORT" --bind 127.0.0.1 >/dev/null 2>&1 &
  echo $! >"$DIR/.krone-spiel-server.pid"
  for _ in $(seq 1 40); do
    port_open && break
    sleep 0.05
  done
fi

echo "Chrome öffnet — für Musik im Spiel „Spiel starten“ drücken." >&2

URL="http://127.0.0.1:$PORT/index.html"
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

echo "Chrome nicht gefunden. Öffne im Browser: $URL" >&2
xdg-open "$URL" 2>/dev/null || true
