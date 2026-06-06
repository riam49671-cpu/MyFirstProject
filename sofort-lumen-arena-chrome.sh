#!/usr/bin/env bash
# Öffnet Lumen-Arena in Chrome/Chromium.
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
exec "$ROOT/open-chrome.sh" lumen-arena.html
