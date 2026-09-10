#!/usr/bin/env python3
"""How much does running the API server in Docker cost?

The published supalite benchmark compared supalite in-process against a
containerised Supabase stack. This measures the container half of that
difference in isolation: the *same* PostgREST binary, the same config, the same
single core, the same Postgres — run three ways.

  native   process on the host
  host-net container, --network host (cgroup/namespace cost only)
  bridge   container, default bridge + published port + NAT'd DB connection

Everything else is held constant, so the deltas are attributable to Docker.
"""
import json, os, statistics, subprocess, sys, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "bench"))
import run as H  # noqa: E402

IMAGE = "mirror.gcr.io/postgrest/postgrest:latest"
SCENARIOS = [s for s in json.load(open(os.path.join(ROOT, "bench", "scenarios.json")))
             if s["id"] in ("tiny-select", "page-25", "insert-minimal")]
API_CPUS, PG_CPUS, LG_CPUS = "0", "1,2", "3"
CPUSETS = {"api": H.parse_cpuset(API_CPUS), "pg": H.parse_cpuset(PG_CPUS),
           "loadgen": H.parse_cpuset(LG_CPUS)}
CONNS, DURATION, WARMUP, REPEATS = 32, 10, 3, 2
BRIDGE_GW = subprocess.run(
    ["docker", "network", "inspect", "bridge", "-f",
     "{{(index .IPAM.Config 0).Gateway}}"],
    capture_output=True, text=True).stdout.strip()


def probe(timeout=90):
    for _ in range(timeout * 2):
        if subprocess.run(["curl", "-sf", "-o", "/dev/null",
                           "http://127.0.0.1:3002/posts?select=id&limit=1"]).returncode == 0:
            return True
        time.sleep(0.5)
    return False


def rm_container():
    subprocess.run(["docker", "rm", "-f", "pgrst-bench"],
                   capture_output=True, text=True)


def start(mode):
    if mode == "native":
        p = subprocess.Popen(["taskset", "-c", API_CPUS, "./postgrest/postgrest",
                              "postgrest/postgrest.conf"], cwd=ROOT,
                             stdout=open("/tmp/bench-run/pgrst-native.log", "w"),
                             stderr=subprocess.STDOUT, stdin=subprocess.DEVNULL,
                             start_new_session=True)
        if not probe():
            raise RuntimeError("native postgrest did not come up")
        return p
    rm_container()
    env = ["-e", "PGRST_DB_SCHEMAS=public", "-e", "PGRST_DB_ANON_ROLE=anon",
           "-e", "PGRST_DB_POOL=10", "-e", "PGRST_DB_AGGREGATES_ENABLED=true",
           "-e", "PGRST_LOG_LEVEL=error",
           "-e", "PGRST_JWT_SECRET=bench-jwt-secret-at-least-32-chars-long!!"]
    if mode == "host-net":
        cmd = (["docker", "run", "-d", "--name", "pgrst-bench",
                "--cpuset-cpus", API_CPUS, "--network", "host",
                "-e", "PGRST_SERVER_PORT=3002",
                "-e", "PGRST_SERVER_HOST=127.0.0.1",
                "-e", f"PGRST_DB_URI=postgres://authenticator:benchpass@127.0.0.1:5432/bench"]
               + env + [IMAGE])
    elif mode == "bridge":
        cmd = (["docker", "run", "-d", "--name", "pgrst-bench",
                "--cpuset-cpus", API_CPUS, "-p", "127.0.0.1:3002:3000",
                "-e", "PGRST_SERVER_PORT=3000",
                "-e", "PGRST_SERVER_HOST=*",
                "-e", f"PGRST_DB_URI=postgres://authenticator:benchpass@{BRIDGE_GW}:5432/bench"]
               + env + [IMAGE])
    else:
        raise ValueError(mode)
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        raise RuntimeError(r.stderr)
    if not probe():
        logs = subprocess.run(["docker", "logs", "pgrst-bench"],
                              capture_output=True, text=True)
        raise RuntimeError(f"container postgrest did not come up:\n{logs.stdout}{logs.stderr}")
    return None


def stop(mode, proc):
    if mode == "native":
        H.stop_server(proc)
    else:
        rm_container()


def measure(mode, sc):
    """Same wrk driver as the main matrix; CPU is read from the pinned core set
    because the workload lives in a container namespace for two of the modes."""
    tmp = "/tmp/bench-run/wrk-docker.json"
    for f in (tmp,):
        if os.path.exists(f):
            os.remove(f)
    H.wrk_run("postgrest", sc, CONNS, WARMUP, 1, LG_CPUS, tmp)
    os.remove(tmp)
    H.psql("select monitor.pg_stat_statements_reset()")
    c0, t0 = H.cpu_core_ticks(), time.time()
    stats = H.wrk_run("postgrest", sc, CONNS, DURATION, 1, LG_CPUS, tmp)
    c1, t1 = H.cpu_core_ticks(), time.time()
    os.remove(tmp)
    wall = t1 - t0
    api = H.core_busy_seconds(c0, c1, CPUSETS["api"])
    return {
        "mode": mode, "scenario": sc["id"], "rps": stats["rps"],
        "p50_ms": round(stats["p50_us"] / 1000, 3),
        "p99_ms": round(stats["p99_us"] / 1000, 3),
        "api_cpu_us_per_req": round(api * 1e6 / stats["requests"], 1),
        "api_core_saturation": round(api / (wall * len(CPUSETS["api"])), 3),
        "pg_cores_busy": round(H.core_busy_seconds(c0, c1, CPUSETS["pg"]) / wall, 3),
        "loadgen_core_saturation": round(
            H.core_busy_seconds(c0, c1, CPUSETS["loadgen"]) / (wall * len(CPUSETS["loadgen"])), 3),
        "errors": sum(stats[k] for k in ("errors_connect", "errors_read", "errors_write",
                                         "errors_status", "errors_timeout")),
    }


raw = []
try:
    H.kill_stale_servers()
    rm_container()
    for rep in range(REPEATS):
        for mode in ("native", "host-net", "bridge"):  # interleaved per repeat
            proc = start(mode)
            try:
                for sc in SCENARIOS:
                    r = measure(mode, sc)
                    r["repeat"] = rep
                    raw.append(r)
                    print(f"  {mode:9} {sc['id']:16} rep{rep}  {r['rps']:8.1f} rps  "
                          f"p50={r['p50_ms']:6.2f}ms  api_cpu={r['api_cpu_us_per_req']:7.1f}us/req  "
                          f"sat[api={r['api_core_saturation']:.2f} pg={r['pg_cores_busy']:.2f}] "
                          f"err={r['errors']}")
            finally:
                stop(mode, proc)
finally:
    rm_container()

summary = []
for scen in [s["id"] for s in SCENARIOS]:
    for mode in ("native", "host-net", "bridge"):
        rs = [r for r in raw if r["scenario"] == scen and r["mode"] == mode]
        if not rs:
            continue
        summary.append({
            "scenario": scen, "mode": mode,
            **{k: round(statistics.median(r[k] for r in rs), 3)
               for k in ("rps", "p50_ms", "p99_ms", "api_cpu_us_per_req",
                         "api_core_saturation", "pg_cores_busy")},
            "errors": sum(r["errors"] for r in rs),
        })

out = {"image": IMAGE, "bridge_gateway": BRIDGE_GW,
       "config": {"connections": CONNS, "duration_s": DURATION, "warmup_s": WARMUP,
                  "repeats": REPEATS, "api_cpus": API_CPUS, "pg_cpus": PG_CPUS,
                  "loadgen_cpus": LG_CPUS},
       "raw": raw, "summary": summary}
json.dump(out, open(os.path.join(ROOT, "results", "docker-overhead.json"), "w"), indent=2)

print("\nmedians:")
for scen in [s["id"] for s in SCENARIOS]:
    base = next(s for s in summary if s["scenario"] == scen and s["mode"] == "native")
    for mode in ("native", "host-net", "bridge"):
        s = next(x for x in summary if x["scenario"] == scen and x["mode"] == mode)
        print(f"  {scen:16} {mode:9} {s['rps']:8.1f} rps  "
              f"({s['rps'] / base['rps'] * 100:5.1f}% of native)  p50={s['p50_ms']:.2f}ms")
print("\nwrote results/docker-overhead.json")
