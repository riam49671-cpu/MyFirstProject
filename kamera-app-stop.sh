#!/usr/bin/env bash
# Stoppt alten Server auf Port 8773 (simple http.server ohne Galerie-API).
set -e
PORT=8773
fuser -k "${PORT}/tcp" 2>/dev/null || true
pkill -f "http.server ${PORT}" 2>/dev/null || true
echo "Port ${PORT} frei." >&2
