#!/usr/bin/env bash
# Öffnet Offline-Rex (Dino-Lauf) in Chrome/Chromium.
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
exec "$ROOT/open-chrome.sh" offline-dino.html
