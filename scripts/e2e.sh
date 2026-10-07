#!/bin/bash
# One build per run, one server per run unit, serving that build (ADR 0013).
#
#   scripts/e2e.sh quick [playwright args…]   the PR fix loop: desktop, quick specs
#   scripts/e2e.sh full  [playwright args…]   everything, in chunks of 4 spec files
#
# Playwright reuses the server this script starts because the config sets
# reuseExistingServer off CI, so do not export CI here. Each unit's log must
# show Playwright's "WebServer is already available" line; without it Playwright
# started (and rebuilt) a server of its own, and the unit fails.
#
# Written for macOS's bash 3.2: no mapfile, and no bare "${arr[@]}" on a
# possibly empty array under set -u.
set -euo pipefail

PORT=4173
URL="http://localhost:$PORT"
CHUNK_SIZE=4
SUITE="${1:-}"

usage() {
  echo "usage: scripts/e2e.sh <quick|full> [playwright args…]" >&2
  exit 2
}

case "$SUITE" in
  quick|full) shift ;;
  *) usage ;;
esac

cd "$(dirname "$0")/.."

SERVER_PID=""
SERVER_LOG=""
SUMMARY=()
FAILED=0

mtime() { stat -f %m "$1" 2>/dev/null || stat -c %Y "$1"; }
strip_ansi() { sed 's/\x1b\[[0-9;]*[A-Za-z]//g'; }
port_pids() { lsof -ti:"$PORT" 2>/dev/null || true; }

stop_server() {
  if [ -n "$SERVER_PID" ]; then
    # The server runs in its own process group (see start_server); kill that
    # group only, never a blanket pkill that could hit a running dev server.
    kill -TERM -- "-$SERVER_PID" 2>/dev/null || true
    local i=0
    while [ -n "$(port_pids)" ] && [ "$i" -lt 50 ]; do sleep 0.2; i=$((i + 1)); done
    kill -KILL -- "-$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
    SERVER_PID=""
  fi
  local i=0
  while [ -n "$(port_pids)" ] && [ "$i" -lt 50 ]; do sleep 0.2; i=$((i + 1)); done
  if [ -n "$(port_pids)" ]; then
    echo "e2e: port $PORT still held after stopping the server" >&2
    return 1
  fi
}

trap 'stop_server || true' EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

start_server() {
  SERVER_LOG="$(mktemp -t e2e-server)"
  # perl's setpgrp puts the server in its own process group, so stop_server can
  # kill it as a group and a terminal Ctrl-C does not reach it before the trap.
  perl -e 'setpgrp(0, 0); exec @ARGV' npx wrangler dev --port "$PORT" >"$SERVER_LOG" 2>&1 &
  SERVER_PID=$!
  local waited=0
  until [ "$(curl -s -o /dev/null -w '%{http_code}' "$URL" || true)" = "200" ]; do
    if [ "$waited" -ge 120 ]; then
      echo "e2e: server did not answer 200 on $URL within 120 s; log tail:" >&2
      tail -20 "$SERVER_LOG" >&2
      return 1
    fi
    sleep 1
    waited=$((waited + 1))
  done
}

# run_unit <label> <command…>: one server, one Playwright run, one summary line.
run_unit() {
  local label="$1"
  shift
  local log rc counts
  log="$(mktemp -t e2e-run)"
  start_server
  set +e
  DEBUG=pw:webserver "$@" 2>&1 | tee "$log"
  rc=$?
  set -e
  if ! grep -q 'WebServer is already available' "$log"; then
    echo "e2e: Playwright did not reuse the server on $PORT for: $label" >&2
    rc=1
  fi
  if [ "$(mtime dist/index.html)" != "$BUILD_MTIME" ]; then
    echo "e2e: dist/index.html changed during: $label" >&2
    rc=1
  fi
  stop_server
  counts="$(strip_ansi <"$log" | grep -E '^ *[0-9]+ (passed|failed|flaky|skipped|did not run)' | sed 's/^ *//' | tr '\n' ' ' || true)"
  SUMMARY+=("exit $rc · ${counts:-no counts} · $label")
  [ "$rc" -eq 0 ] || FAILED=1
  rm -f "$log" "$SERVER_LOG"
}

for pid in $(port_pids); do kill -9 "$pid" 2>/dev/null || true; done

npm run build
BUILD_MTIME="$(mtime dist/index.html)"

if [ "$SUITE" = "quick" ]; then
  run_unit "quick suite" env E2E_SUITE=quick npx playwright test ${@+"$@"}
else
  files=(tests/e2e/*.spec.ts)
  i=0
  while [ "$i" -lt "${#files[@]}" ]; do
    chunk=("${files[@]:$i:$CHUNK_SIZE}")
    run_unit "${chunk[*]}" npx playwright test --pass-with-no-tests "${chunk[@]}" ${@+"$@"}
    i=$((i + CHUNK_SIZE))
  done
fi

echo
echo "e2e $SUITE summary:"
for line in "${SUMMARY[@]}"; do echo "  $line"; done
exit "$FAILED"
