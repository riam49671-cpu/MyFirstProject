#!/usr/bin/env bash
# Legt „Kamera-App“ ins Linux-Anwendungsmenü (Activities / App-Übersicht).
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
DEST="$HOME/.local/share/applications/kamera-app.desktop"

mkdir -p "$HOME/.local/share/applications"
sed "s|__PROJECT_DIR__|$DIR|g" "$DIR/kamera-app.desktop" >"$DEST"
chmod +x "$DEST"
chmod +x "$DIR/sofort-kamera-app.sh" "$DIR/kamera-app-fenster.py" "$DIR/kamera-app-stop.sh"

if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "$HOME/.local/share/applications" 2>/dev/null || true
fi

echo "Fertig! Im Menü nach „Kamera-App“ suchen (Kamera-Symbol)." >&2
