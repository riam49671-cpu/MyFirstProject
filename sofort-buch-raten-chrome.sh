#!/usr/bin/env bash
# Öffnet Buch raten in Chrome/Chromium.
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
exec "$ROOT/open-chrome.sh" buch-raten.html
