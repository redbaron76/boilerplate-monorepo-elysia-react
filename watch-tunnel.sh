#!/usr/bin/env bash
# Watchdog tunnel Cloudflare
set -uo pipefail

TUNNEL_LOG="/tmp/cloudflared_fe.log"
PIDFILE="/tmp/boilerplate-tunnel.pid"
CHECK_INTERVAL=15

while true; do
  if [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
    sleep $CHECK_INTERVAL
    continue
  fi
  echo "[$(date)] Tunnel morto, riavvio..."
  /tmp/cloudflared tunnel --url http://localhost:5173 --logfile "$TUNNEL_LOG" &
  echo $! > "$PIDFILE"
  sleep 3
done
