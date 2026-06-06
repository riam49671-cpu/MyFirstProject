#!/usr/bin/env bash
# Einmal ausführen — ffmpeg für Video + Menü-Einträge für Kamera & Lego.
set -e
echo "Installiere ffmpeg für Kamera-Videos …" >&2
sudo apt-get install -y ffmpeg
DIR="$(cd "$(dirname "$0")" && pwd)"
chmod +x "$DIR/kamera-app-fenster.py" "$DIR/sofort-kamera-app.sh" "$DIR/kamera-app-stop.sh"
chmod +x "$DIR/sofort-lego-spiel.sh"
"$DIR/applikationen-aktualisieren.sh"
echo "Fertig! Im Menü: „Kamera-App“ und „Lego-Bauplatz“." >&2
