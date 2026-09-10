#!/usr/bin/env bash
# Start/stop the two API servers under test, each pinned to a fixed CPU set.
# Usage: servers.sh {start-supalite|start-postgrest|stop-supalite|stop-postgrest} [cpuset]
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
RUN=/tmp/bench-run
mkdir -p "$RUN"
export DO_NOT_TRACK=1

start_supalite() {
   local cpus="${1:-0}" rt="${2:-node}" bin
   case "$rt" in
      node) bin="$(command -v node)" ;;
      bun)  bin="$(command -v bun)" ;;
      *) echo "unknown runtime $rt" >&2; exit 1 ;;
   esac
   setsid nohup taskset -c "$cpus" "$bin" node_modules/@supabase/lite/dist/cli/index.js \
      start --no-admin > "$RUN/supalite.log" 2>&1 < /dev/null &
   echo $! > "$RUN/supalite.pid"
   for _ in $(seq 1 60); do
      curl -sf -o /dev/null -H "apikey: $(grep PUBLISHABLE .env | cut -d= -f2)" \
         "http://127.0.0.1:3001/rest/v1/posts?select=id&limit=1" && { echo "supalite up ($rt, cpus=$cpus)"; return 0; }
      sleep 0.5
   done
   echo "supalite failed to come up" >&2; tail -20 "$RUN/supalite.log" >&2; exit 1
}

start_postgrest() {
   local cpus="${1:-0}"
   setsid nohup taskset -c "$cpus" ./postgrest/postgrest postgrest/postgrest.conf \
      > "$RUN/postgrest.log" 2>&1 < /dev/null &
   echo $! > "$RUN/postgrest.pid"
   for _ in $(seq 1 60); do
      curl -sf -o /dev/null "http://127.0.0.1:3002/posts?select=id&limit=1" && { echo "postgrest up (cpus=$cpus)"; return 0; }
      sleep 0.5
   done
   echo "postgrest failed to come up" >&2; tail -20 "$RUN/postgrest.log" >&2; exit 1
}

stop_one() {
   local name="$1" f="$RUN/$name.pid"
   [ -f "$f" ] || return 0
   local pid; pid="$(cat "$f")"
   kill -TERM "-$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null || true
   sleep 1
   kill -KILL "-$pid" 2>/dev/null || kill -KILL "$pid" 2>/dev/null || true
   rm -f "$f"
   echo "$name stopped"
}

case "${1:-}" in
   start-supalite)  start_supalite "${2:-0}" "${3:-node}" ;;
   start-postgrest) start_postgrest "${2:-0}" ;;
   stop-supalite)   stop_one supalite ;;
   stop-postgrest)  stop_one postgrest ;;
   stop-all)        stop_one supalite; stop_one postgrest ;;
   *) echo "usage: $0 {start-supalite|start-postgrest|stop-supalite|stop-postgrest|stop-all} [cpuset] [node|bun]" >&2; exit 2 ;;
esac
