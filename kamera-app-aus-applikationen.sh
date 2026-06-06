#!/usr/bin/env bash
# Entfernt „Kamera-App“ aus dem Linux-Anwendungsmenü.
set -e
DEST="$HOME/.local/share/applications/kamera-app.desktop"
rm -f "$DEST"

if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "$HOME/.local/share/applications" 2>/dev/null || true
fi

echo "Kamera-App ist nicht mehr im Anwendungsmenü." >&2
echo "Starte sie in Chrome mit: ./sofort-kamera-app.sh" >&2
