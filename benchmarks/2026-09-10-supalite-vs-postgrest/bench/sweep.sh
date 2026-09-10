#!/usr/bin/env bash
# Concurrency sweep + a pure-Postgres control that isolates how much of the gap
# is the per-request statement count rather than the API implementation.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
SCEN=tiny-select,page-25,insert-minimal

for c in 1 4 16 64; do
   python3 bench/run.py --out "results/sweep-1core-c$c.json" \
      --scenarios "$SCEN" --connections "$c" --threads 1 \
      --duration 10 --warmup 3 --repeats 2
done
echo "sweep done"
