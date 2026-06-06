#!/usr/bin/env bash
# Auf einem ANDEREN Linux-Computer einmal ausführen (nach git clone).
# Legt Lego-Stapel (und optional Kamera-App) ins Anwendungsmenü.
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

echo "=== MyFirstProject — Installation ===" >&2
echo "Ordner: $DIR" >&2
echo "" >&2

need() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Fehlt: $1 — bitte zuerst installieren." >&2
    exit 1
  fi
}

need git
need python3
need bash

chmod +x "$DIR/sofort-lego-spiel.sh" "$DIR/lego-spiel-ins-applikationen.sh" 2>/dev/null || true
chmod +x "$DIR/sofort-kamera-app.sh" "$DIR/kamera-app-ins-applikationen.sh" 2>/dev/null || true
chmod +x "$DIR/applikationen-aktualisieren.sh" 2>/dev/null || true

"$DIR/lego-spiel-ins-applikationen.sh"

if [ -x "$DIR/kamera-app-ins-applikationen.sh" ]; then
  "$DIR/kamera-app-ins-applikationen.sh"
fi

PAGES_URL="https://riam49671-cpu.github.io/MyFirstProject/lego-spiel.html"

echo "" >&2
echo "Fertig!" >&2
echo "  • Anwendungsmenü → „Lego-Stapel“ suchen und starten" >&2
echo "  • Oder im Browser (ohne Menü): $PAGES_URL" >&2
echo "" >&2
