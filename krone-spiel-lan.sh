#!/usr/bin/env bash
# Startet den Server im Heimnetz: Bruder & andere im gleichen WLAN können
# die Seite im Browser öffnen (ohne den Ordner zu kopieren).
# Nur im vertrauenswürdigen Netz nutzen – nicht im öffentlichen Café-WLAN.
set -e
PORT=8765
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

if timeout 0.2 bash -c "echo >/dev/tcp/127.0.0.1/$PORT" 2>/dev/null; then
  echo "Port $PORT ist schon belegt." >&2
  echo "Beende zuerst den anderen Server (oder Rechner neu starten)." >&2
  exit 1
fi

python3 -m http.server "$PORT" --bind 0.0.0.0 >/dev/null 2>&1 &
echo $! >"$DIR/.krone-spiel-server.pid"
sleep 0.4

echo ""
echo "Krone Spiel – für andere Geräte im gleichen Netzwerk"
echo "===================================================="
echo ""
IPS=""
for ip in $(hostname -I 2>/dev/null); do
  case "$ip" in 127.*|::1) continue ;; esac
  echo "  → http://${ip}:${PORT}/index.html"
  IPS=1
done
if [ -z "$IPS" ]; then
  echo "  (Keine LAN-IP gefunden – ist WLAN/Ethernet aktiv?)"
  echo "  Lokal bei dir: http://127.0.0.1:${PORT}/index.html"
else
  echo ""
  echo "Diese Zeile auf dem Handy/anderen PC im Browser einfügen."
fi
echo ""
echo "Hinweis: Jeder spielt auf seinem Gerät eine eigene Runde –"
echo "nicht dieselbe Partie über zwei Computer (dafür bräuchte man Online-Modus)."
echo ""

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

echo "Chrome nicht gefunden. Öffne lokal: $URL" >&2
xdg-open "$URL" 2>/dev/null || true
