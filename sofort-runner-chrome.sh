#!/usr/bin/env bash
# Neon-Sprinter sofort in Chrome (mit Ton nach Klick auf „Los“).
exec "$(cd "$(dirname "$0")" && pwd)/open-chrome.sh" runner.html
