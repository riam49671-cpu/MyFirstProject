#!/usr/bin/env bash
# Startet Webseite (Port 8765) + Online-Spielserver (Port 8770) für mehrere Computer im WLAN.
# Usage: ./start-online-party.sh
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"
HTTP_PORT=8765
WS_PORT=8770
PID_FILE="$DIR/.krone-party-pids"

if ! python3 -c "import websockets" 2>/dev/null; then
  echo "Bitte zuerst: pip install -r requirements.txt" >&2
  exit 1
fi

start_http() {
  if timeout 0.2 bash -c "echo >/dev/tcp/127.0.0.1/$HTTP_PORT" 2>/dev/null; then
    echo "Web ($HTTP_PORT) läuft schon."
  else
    python3 -m http.server "$HTTP_PORT" --bind 0.0.0.0 >/dev/null 2>&1 &
    echo $! >>"$PID_FILE"
    sleep 0.35
    echo "Web-Server gestartet (Port $HTTP_PORT)."
  fi
}

start_ws() {
  if timeout 0.2 bash -c "echo >/dev/tcp/127.0.0.1/$WS_PORT" 2>/dev/null; then
    echo "Online-Server ($WS_PORT) läuft schon."
  else
    python3 "$DIR/server/krone_server.py" >/dev/null 2>&1 &
    echo $! >>"$PID_FILE"
    sleep 0.5
    echo "Krone-Online-Server gestartet (Port $WS_PORT)."
  fi
}

rm -f "$PID_FILE"
touch "$PID_FILE"
start_http
start_ws

echo ""
echo "=== Krone Spiel – für andere Computer (dieselbe Partie) ==="
echo ""
LAN=""
for ip in $(hostname -I 2>/dev/null); do
  case "$ip" in 127.*|::1) continue ;; esac
  echo "  Seite (alle dieselbe im Browser):"
  echo "    http://${ip}:${HTTP_PORT}/index.html"
  echo ""
  echo "  WebSocket (im Spiel unter „Online“ eintragen):"
  echo "    ws://${ip}:${WS_PORT}"
  echo ""
  LAN=1
done
if [ -z "$LAN" ]; then
  echo "  Keine LAN-IP gefunden. Lokal:"
  echo "    http://127.0.0.1:${HTTP_PORT}/index.html"
  echo "    ws://127.0.0.1:${WS_PORT}"
  echo ""
fi
echo "Alle im gleichen WLAN: dieselbe http-Zeile öffnen, dann „Online“ + ws-Zeile."
echo "Beenden: ./stop-online-party.sh  oder  Terminal schließen und Prozesse beenden."
echo ""

URL="http://127.0.0.1:$HTTP_PORT/index.html"
for chrome in google-chrome-stable google-chrome; do
  if command -v "$chrome" >/dev/null 2>&1; then
    exec "$chrome" "$URL"
  fi
done
if command -v chromium >/dev/null 2>&1; then
  exec chromium "$URL"
fi
xdg-open "$URL" 2>/dev/null || true
