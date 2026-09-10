#!/usr/bin/env python3
"""Pure-Postgres control: replay each server's per-request statement shape with
pgbench (no HTTP, no API server) to isolate the cost of the round-trip chatter.

Per-core utilisation is captured so we can say whether Postgres or pgbench was
the limiting component.
"""
import json, os, re, subprocess, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CLK = os.sysconf("SC_CLK_TCK")
# Postgres keeps its pinned cores 1-2; pgbench gets the two idle cores and
# two threads, because a single pgbench thread saturates its own core well
# below the 2-statement shape's ceiling and would cap both shapes.
PG_CPUS, LG_CPUS, LG_THREADS = [1, 2], [0, 3], 2


def ticks():
    out = {}
    for line in open("/proc/stat"):
        if line.startswith("cpu") and len(line) > 3 and line[3].isdigit():
            p = line.split()
            out[int(p[0][3:])] = [int(x) for x in p[1:]]
    return out


def busy(a, b, cpus):
    t = 0.0
    for c in cpus:
        x, y = a[c], b[c]
        t += ((sum(y) - y[3] - y[4]) - (sum(x) - x[3] - x[4])) / CLK
    return t


results = []
for shape in ("postgrest", "supalite"):
    for clients in (10, 32):
        c0, t0 = ticks(), time.time()
        r = subprocess.run(
            ["sudo", "-u", "postgres", "env", "PGPASSWORD=benchpass",
             "taskset", "-c", ",".join(map(str, LG_CPUS)), "pgbench",
             "-h", "127.0.0.1", "-U", "authenticator", "-d", "bench", "-n",
             "-c", str(clients), "-j", str(LG_THREADS), "-T", "15",
             "-f", f"sql/pgbench-{shape}-shape.sql"],
            cwd=ROOT, capture_output=True, text=True)
        c1, t1 = ticks(), time.time()
        wall = t1 - t0
        tps = float(re.search(r"tps = ([\d.]+)", r.stdout).group(1))
        lat = float(re.search(r"latency average = ([\d.]+)", r.stdout).group(1))
        results.append({
            "shape": shape, "clients": clients, "tps": round(tps, 1),
            "latency_avg_ms": lat,
            "pg_cores_busy": round(busy(c0, c1, PG_CPUS) / wall, 3),
            "pg_core_saturation": round(busy(c0, c1, PG_CPUS) / (wall * len(PG_CPUS)), 3),
            "pgbench_core_saturation": round(busy(c0, c1, LG_CPUS) / (wall * len(LG_CPUS)), 3),
            "statements_per_txn": len([l for l in open(f"{ROOT}/sql/pgbench-{shape}-shape.sql")
                                       if l.strip()]),
        })
        print(json.dumps(results[-1]))

json.dump(results, open(os.path.join(ROOT, "results", "chatter-control.json"), "w"), indent=2)
print("\nratio at 10 clients:",
      round(results[0]["tps"] / results[2]["tps"], 2), "x")
print("ratio at 32 clients:",
      round(results[1]["tps"] / results[3]["tps"], 2), "x")
