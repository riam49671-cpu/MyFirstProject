#!/usr/bin/env bash
# Öffnet Sternenhüpfer in Chrome/Chromium.
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
exec "$ROOT/open-chrome.sh" sternenhuepfer.html
