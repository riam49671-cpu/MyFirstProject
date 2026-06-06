#!/usr/bin/env bash
# Sofort Chrome — optional: Dateiname (Standard: index.html = Krone).
# Im Browser danach „Spiel starten“ / „Los“: Chrome spielt Musik erst nach Klick.
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
echo "▶ ${ROOT}/open-chrome.sh — nach dem Öffnen Start drücken, dann hörst du die neue Musik." >&2
exec "$ROOT/open-chrome.sh" "${1:-index.html}"
