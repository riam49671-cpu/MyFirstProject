#!/usr/bin/env bash
# Öffnet eine Projekt-HTML-Datei sofort in Google Chrome (Fallback: Chromium).
# Ohne Argument: Krone-Menü (index.html).
# Beispiele:
#   ./sofort-chrome.sh
#   ./sofort-chrome.sh snake.html
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
exec "$ROOT/open-chrome.sh" "${1:-index.html}"
