#!/usr/bin/env bash
# Startet den lokalen Server (Port 8765) und öffnet Google Chrome.
# Kurzbefehl in Chrome: siehe chrome-krone-anleitung.txt
set -e
PORT=8765
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

if timeout 0.2 bash -c "echo >/dev/tcp/127.0.0.1/$PORT" 2>/dev/null; then
  echo "Server läuft schon auf Port $PORT."
else
  python3 -m http.server "$PORT" --bind 127.0.0.1 >/dev/null 2>&1 &
  echo $! >"$DIR/.krone-spiel-server.pid"
  sleep 0.35
  echo "Server gestartet: http://127.0.0.1:$PORT/"
fi

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
