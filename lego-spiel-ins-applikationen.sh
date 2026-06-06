#!/usr/bin/env bash
# Legt „Lego-Bauplatz“ ins Linux-Anwendungsmenü (Activities / App-Übersicht).
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
DEST="$HOME/.local/share/applications/lego-spiel.desktop"

mkdir -p "$HOME/.local/share/applications"
sed "s|__PROJECT_DIR__|$DIR|g" "$DIR/lego-spiel.desktop" >"$DEST"
chmod +x "$DEST"
chmod +x "$DIR/sofort-lego-spiel.sh"

if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "$HOME/.local/share/applications" 2>/dev/null || true
fi

echo "Fertig! Im Menü nach „Lego-Bauplatz“ suchen (Spiel-Symbol)." >&2
