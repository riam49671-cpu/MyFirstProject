#!/usr/bin/env bash
# Legt „Viele Spiele“ (Lego Games) ins Linux-Anwendungsmenü.
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
DEST="$HOME/.local/share/applications/lego-spiel.desktop"

mkdir -p "$HOME/.local/share/applications"
sed "s|__PROJECT_DIR__|$DIR|g" "$DIR/lego-spiel.desktop" >"$DEST"
chmod +x "$DEST"
chmod +x "$DIR/sofort-lego-spiel.sh"

if command -v gio >/dev/null 2>&1; then
  gio set "$DEST" metadata::trusted true 2>/dev/null || true
fi

if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "$HOME/.local/share/applications" 2>/dev/null || true
fi

echo "Viele Spiele ist im Anwendungsmenü — suche nach „Viele Spiele“." >&2
