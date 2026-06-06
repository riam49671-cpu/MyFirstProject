#!/usr/bin/env bash
# Nach Ordner-Umbenennung oder Umzug: Menü-Einträge mit neuem Pfad aktualisieren.
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
chmod +x "$DIR/kamera-app-ins-applikationen.sh" "$DIR/lego-spiel-ins-applikationen.sh"
"$DIR/kamera-app-ins-applikationen.sh"
"$DIR/lego-spiel-ins-applikationen.sh"
echo "Alle Pfade aktualisiert: $DIR" >&2
