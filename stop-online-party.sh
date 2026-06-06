#!/usr/bin/env bash
# Stoppt die mit start-online-party.sh gestarteten Hintergrundprozesse (falls PID-Datei da ist).
DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$DIR/.krone-party-pids"
if [ ! -f "$PID_FILE" ]; then
  echo "Keine .krone-party-pids gefunden. Ports manuell freigeben oder Prozess beenden."
  exit 0
fi
while read -r pid; do
  [ -n "$pid" ] && kill "$pid" 2>/dev/null || true
done <"$PID_FILE"
rm -f "$PID_FILE"
echo "Gestoppt (falls die PIDs noch liefen)."
