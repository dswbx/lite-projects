#!/usr/bin/env python3
"""Benchmark driver: supalite (Postgres driver) vs bare PostgREST, same Postgres.

Fairness rules baked in here:
  * one shared Postgres instance, one shared schema, one shared dataset;
  * every server connects as the same login role (`authenticator`) and every
    request executes as the same role (`anon`) with native RLS active;
  * identical HTTP request bytes per scenario apart from base path and the
    `apikey` header supalite requires;
  * fixed CPU budgets via taskset: API server, Postgres and the load generator
    never share a core;
  * variants are interleaved per scenario (A,B,C,A,B,C) so drift in the VM hits
    all of them equally, and the median of the repeats is reported;
  * CPU seconds are sampled per process so throughput can be normalised into
    CPU-cost-per-request, which is independent of how many cores each side got.
"""
import argparse, json, os, re, statistics, subprocess, sys, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RUN = "/tmp/bench-run"
CLK = os.sysconf("SC_CLK_TCK")
os.makedirs(RUN, exist_ok=True)


def env_value(key):
    for line in open(os.path.join(ROOT, ".env")):
        if line.startswith(key + "="):
            return line.strip().split("=", 1)[1]
    raise KeyError(key)


APIKEY = env_value("SUPABASE_PUBLISHABLE_KEY")

VARIANTS = {
    "postgrest": {
        "label": "PostgREST 16.2 (Haskell, native binary)",
        "base": "http://127.0.0.1:3002",
        "prefix": "",
        "headers": [],
        "cmd": lambda cpus: ["taskset", "-c", cpus, "./postgrest/postgrest",
                             "postgrest/postgrest.conf"],
        "probe": "http://127.0.0.1:3002/posts?select=id&limit=1",
    },
    "supalite-node": {
        "label": "supalite 0.10.0 on Node 22 (lite start, postgres driver)",
        "base": "http://127.0.0.1:3001/rest/v1",
        "prefix": "/rest/v1",
        "headers": [f"apikey: {APIKEY}"],
        "cmd": lambda cpus: ["taskset", "-c", cpus, "node",
                             "node_modules/@supabase/lite/dist/cli/index.js",
                             "start", "--no-admin"],
        "probe": "http://127.0.0.1:3001/rest/v1/posts?select=id&limit=1",
    },
    "supalite-bun": {
        "label": "supalite 0.10.0 on Bun 1.3.11 (lite start, postgres driver)",
        "base": "http://127.0.0.1:3003/rest/v1",
        "prefix": "/rest/v1",
        "headers": [f"apikey: {APIKEY}"],
        "cmd": lambda cpus: ["taskset", "-c", cpus, "bun",
                             "node_modules/@supabase/lite/dist/cli/index.js",
                             "start", "--no-admin", "--config",
                             "supabase/config-bun.toml"],
        "probe": "http://127.0.0.1:3003/rest/v1/posts?select=id&limit=1",
    },
}


# ---------------------------------------------------------------- process stats
def proc_cpu(pid):
    try:
        with open(f"/proc/{pid}/stat") as f:
            parts = f.read().rsplit(") ", 1)[1].split()
        return (int(parts[11]) + int(parts[12])) / CLK  # utime + stime
    except (FileNotFoundError, ProcessLookupError, IndexError):
        return 0.0


def proc_peak_rss_kb(pid):
    try:
        for line in open(f"/proc/{pid}/status"):
            if line.startswith("VmHWM:"):
                return int(line.split()[1])
    except FileNotFoundError:
        pass
    return 0


def cpu_core_ticks():
    """Per-core jiffie counters from /proc/stat, keyed by core index."""
    out = {}
    for line in open("/proc/stat"):
        if line.startswith("cpu") and len(line) > 3 and line[3].isdigit():
            parts = line.split()
            out[int(parts[0][3:])] = [int(x) for x in parts[1:]]
    return out


def core_busy_seconds(before, after, cpus):
    """Busy (non-idle, non-iowait) core-seconds on the given core set."""
    total = 0.0
    for c in cpus:
        a, b = before[c], after[c]
        busy_a = sum(a) - a[3] - a[4]
        busy_b = sum(b) - b[3] - b[4]
        total += (busy_b - busy_a) / CLK
    return total


def parse_cpuset(spec):
    cpus = []
    for part in spec.split(","):
        if "-" in part:
            lo, hi = part.split("-")
            cpus += list(range(int(lo), int(hi) + 1))
        else:
            cpus.append(int(part))
    return cpus


def postmaster_affinity():
    """Cores the running postmaster is actually pinned to.

    `--pg-cpus` only tells this script which cores to *measure*; Postgres's own
    affinity is set when the cluster is started. Getting those out of sync
    silently invalidates a run (the API server and Postgres end up sharing a
    core), so it is checked rather than assumed.
    """
    for pid in postgres_pids():
        try:
            with open(f"/proc/{pid}/status") as f:
                for line in f:
                    if line.startswith("Cpus_allowed_list:"):
                        return parse_cpuset(line.split(":", 1)[1].strip())
        except OSError:
            continue
    return None


def check_affinity(cpusets):
    actual = postmaster_affinity()
    if actual is None:
        print("  !! could not read postmaster CPU affinity; skipping check")
        return
    declared = set(cpusets["pg"])
    if set(actual) != declared:
        raise SystemExit(
            f"Postgres is pinned to {sorted(actual)} but --pg-cpus says "
            f"{sorted(declared)}.\n"
            f"Restart the cluster on the intended cores, e.g.:\n"
            f"  pg_ctlcluster 16 main stop && "
            f"taskset -c {','.join(map(str, sorted(declared)))} pg_ctlcluster 16 main start")
    overlap = (set(actual) & set(cpusets["api"])) | (set(actual) & set(cpusets["loadgen"]))
    if overlap:
        raise SystemExit(
            f"Postgres shares core(s) {sorted(overlap)} with the API server or the "
            f"load generator. The CPU budgets must be disjoint or the numbers are "
            f"not attributable.")
    print(f"  affinity ok: api={cpusets['api']} pg={sorted(actual)} "
          f"loadgen={cpusets['loadgen']}")


def postgres_pids():
    pids = []
    for entry in os.listdir("/proc"):
        if not entry.isdigit():
            continue
        try:
            with open(f"/proc/{entry}/comm") as f:
                if f.read().strip().startswith("postgres"):
                    pids.append(int(entry))
        except OSError:
            continue
    return pids


def postgres_cpu_map():
    return {p: proc_cpu(p) for p in postgres_pids()}


def postgres_cpu_delta(before, after):
    """Only pids alive in both snapshots: a backend that spawned or exited mid-run
    would otherwise add or subtract its whole lifetime."""
    shared = set(before) & set(after)
    return sum(after[p] - before[p] for p in shared)


# --------------------------------------------------------------- server control
def psql(sql, tuples_only=True):
    cmd = ["sudo", "-u", "postgres", "psql", "-d", "bench", "-tAc" if tuples_only else "-c", sql]
    return subprocess.run(cmd, capture_output=True, text=True).stdout.strip()


SERVER_MARKERS = ("./postgrest/postgrest", "node_modules/@supabase/lite/dist/cli/index.js")


def stale_server_pids():
    """Find already-running API servers by argv, matching only on argv[0] being
    the interpreter/binary we launch. `ss` is not installed in this image and
    `pkill -f` would match this harness's own command line, so scan /proc."""
    found = []
    me = os.getpid()
    for entry in os.listdir("/proc"):
        if not entry.isdigit() or int(entry) == me:
            continue
        try:
            with open(f"/proc/{entry}/cmdline", "rb") as f:
                argv = f.read().split(b"\0")
        except OSError:
            continue
        argv = [a.decode(errors="replace") for a in argv if a]
        if not argv:
            continue
        exe = os.path.basename(argv[0])
        if exe not in ("postgrest", "node", "bun", "taskset"):
            continue
        if any(m in " ".join(argv) for m in SERVER_MARKERS):
            found.append(int(entry))
    return found


def kill_stale_servers():
    for pid in stale_server_pids():
        try:
            os.kill(pid, 9)
            print(f"  killed stale server pid {pid}")
        except ProcessLookupError:
            pass
    if stale_server_pids():
        time.sleep(1)


def start_server(name, cpus):
    v = VARIANTS[name]
    log = open(f"{RUN}/{name}.log", "w")
    p = subprocess.Popen(v["cmd"](cpus), cwd=ROOT, stdout=log, stderr=log,
                         stdin=subprocess.DEVNULL, start_new_session=True,
                         env={**os.environ, "DO_NOT_TRACK": "1"})
    headers = []
    for h in v["headers"]:
        headers += ["-H", h]
    for _ in range(120):
        if p.poll() is not None:
            raise RuntimeError(f"{name} exited during startup (rc={p.returncode}); "
                               f"see {RUN}/{name}.log")
        r = subprocess.run(["curl", "-sf", "-o", "/dev/null", *headers, v["probe"]])
        if r.returncode == 0:
            # a live pid whose CPU counter moves is what the accounting relies on
            if proc_cpu(p.pid) <= 0.0:
                raise RuntimeError(f"{name} answered but pid {p.pid} reports no CPU; "
                                   f"another instance is probably serving that port")
            return p
        time.sleep(0.5)
    raise RuntimeError(f"{name} did not come up; see {RUN}/{name}.log")


def stop_server(p):
    if p is None:
        return
    try:
        os.killpg(os.getpgid(p.pid), 15)
    except (ProcessLookupError, PermissionError):
        p.terminate()
    try:
        p.wait(timeout=10)
    except subprocess.TimeoutExpired:
        try:
            os.killpg(os.getpgid(p.pid), 9)
        except (ProcessLookupError, PermissionError):
            p.kill()


# ------------------------------------------------------------------- wrk driver
def wrk_run(variant, sc, conns, duration, threads, loadgen_cpus, out_file):
    v = VARIANTS[variant]
    headers = "\n".join(v["headers"] + sc.get("headers", []))
    env = {
        **os.environ,
        "BENCH_METHOD": sc["method"],
        "BENCH_PATH": v["prefix"] + sc["path"],
        "BENCH_BODY": sc.get("body", ""),
        "BENCH_HEADERS": headers,
        "BENCH_RAND_MAX": str(sc.get("rand_max", 0)),
        "BENCH_OUT": out_file,
    }
    url = v["base"] + sc["path"].replace("%RAND%", "1")
    cmd = ["taskset", "-c", loadgen_cpus, "wrk", "-t", str(threads), "-c", str(conns),
           "-d", f"{duration}s", "--timeout", "15s", "--latency",
           "-s", "bench/wrk/scenario.lua", url]
    r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, env=env)
    if not os.path.exists(out_file):
        raise RuntimeError(f"wrk produced no output for {variant}/{sc['id']}:\n"
                           f"{r.stdout}\n{r.stderr}")
    with open(out_file) as f:
        return json.load(f)


def measure(variant, server_proc, sc, conns, duration, warmup, threads,
            loadgen_cpus, cpusets):
    tmp = f"{RUN}/wrk-out.json"
    if os.path.exists(tmp):
        os.remove(tmp)
    # warmup: fills the pool, JITs the hot path, warms Postgres pages
    wrk_run(variant, sc, conns, warmup, threads, loadgen_cpus, tmp)
    os.remove(tmp)

    psql("select monitor.pg_stat_statements_reset()")
    core0 = cpu_core_ticks()
    api0, pg0, t0 = proc_cpu(server_proc.pid), postgres_cpu_map(), time.time()
    stats = wrk_run(variant, sc, conns, duration, threads, loadgen_cpus, tmp)
    api1, pg1, t1 = proc_cpu(server_proc.pid), postgres_cpu_map(), time.time()
    core1 = cpu_core_ticks()
    os.remove(tmp)

    pgss = psql("select coalesce(sum(calls),0)::text || '|' || "
                "coalesce(sum(total_exec_time),0)::text from monitor.pg_stat_statements "
                "where query not like '%pg_stat_statements%'")
    calls, exec_ms = (pgss.split("|") + ["0", "0"])[:2]

    reqs = stats["requests"]
    wall = t1 - t0
    pg_cpu_s = postgres_cpu_delta(pg0, pg1)
    api_core_s = core_busy_seconds(core0, core1, cpusets["api"])
    pg_core_s = core_busy_seconds(core0, core1, cpusets["pg"])
    lg_core_s = core_busy_seconds(core0, core1, cpusets["loadgen"])
    stats.update({
        "variant": variant,
        "scenario": sc["id"],
        "connections": conns,
        "wall_s": round(wall, 3),
        "api_cpu_s": round(api1 - api0, 3),
        "pg_cpu_s": round(pg_cpu_s, 3),
        "api_cpu_us_per_req": round((api1 - api0) * 1e6 / reqs, 2) if reqs else None,
        "pg_cpu_us_per_req": round(pg_cpu_s * 1e6 / reqs, 2) if reqs else None,
        # core-set utilisation: tells us which component was the bottleneck
        "api_cores_busy": round(api_core_s / wall, 3),
        "pg_cores_busy": round(pg_core_s / wall, 3),
        "loadgen_cores_busy": round(lg_core_s / wall, 3),
        "api_core_saturation": round(api_core_s / (wall * len(cpusets["api"])), 3),
        "pg_core_saturation": round(pg_core_s / (wall * len(cpusets["pg"])), 3),
        "loadgen_core_saturation": round(lg_core_s / (wall * len(cpusets["loadgen"])), 3),
        "bytes_per_req": round(stats["bytes"] / reqs, 1) if reqs else None,
        "pg_calls_per_req": round(float(calls) / reqs, 3) if reqs else None,
        "pg_exec_ms_per_req": round(float(exec_ms) / reqs, 4) if reqs else None,
        "api_peak_rss_mb": round(proc_peak_rss_kb(server_proc.pid) / 1024, 1),
    })
    return stats


# ------------------------------------------------------------------------ main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--variants", default="postgrest,supalite-node,supalite-bun")
    ap.add_argument("--scenarios", default="")
    ap.add_argument("--api-cpus", default="0")
    ap.add_argument("--pg-cpus", default="1,2")
    ap.add_argument("--loadgen-cpus", default="3")
    ap.add_argument("--connections", type=int, default=32)
    ap.add_argument("--threads", type=int, default=1)
    ap.add_argument("--duration", type=int, default=12)
    ap.add_argument("--warmup", type=int, default=4)
    ap.add_argument("--repeats", type=int, default=2)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    variants = args.variants.split(",")
    scenarios = json.load(open(os.path.join(ROOT, "bench", "scenarios.json")))
    if args.scenarios:
        keep = set(args.scenarios.split(","))
        scenarios = [s for s in scenarios if s["id"] in keep]

    print(f"api_cpus={args.api_cpus} pg_cpus={args.pg_cpus} loadgen_cpus={args.loadgen_cpus} "
          f"c={args.connections} d={args.duration}s reps={args.repeats}")

    cpusets = {"api": parse_cpuset(args.api_cpus),
               "pg": parse_cpuset(args.pg_cpus),
               "loadgen": parse_cpuset(args.loadgen_cpus)}
    procs = {}
    raw = []
    try:
        check_affinity(cpusets)
        kill_stale_servers()
        for v in variants:
            procs[v] = start_server(v, args.api_cpus)
            print(f"  started {v}")
        # let the JIT/pool settle and warm Postgres pages once for everyone
        for v in variants:
            for sc in scenarios:
                wrk_run(v, sc, 8, 1, 1, args.loadgen_cpus, f"{RUN}/wrk-out.json")
                os.remove(f"{RUN}/wrk-out.json")
        print("  global warmup done")

        for sc in scenarios:
            for rep in range(args.repeats):
                for v in variants:  # interleaved: drift hits all variants alike
                    s = measure(v, procs[v], sc, args.connections, args.duration,
                                args.warmup, args.threads, args.loadgen_cpus, cpusets)
                    s["repeat"] = rep
                    raw.append(s)
                    bad = sum(s[k] for k in ("errors_connect", "errors_read",
                                             "errors_write", "errors_status",
                                             "errors_timeout"))
                    flag = "" if bad == 0 else f"  !! {bad} errors"
                    print(f"  {sc['id']:24} {v:15} rep{rep}  "
                          f"{s['rps']:9.1f} rps  p50={s['p50_us']/1000:7.3f}ms "
                          f"p99={s['p99_us']/1000:7.3f}ms  "
                          f"api_cpu={s['api_cpu_us_per_req']:7.1f}us/req "
                          f"pgcalls={s['pg_calls_per_req']:5.2f} "
                          f"sat[api={s['api_core_saturation']:.2f} "
                          f"pg={s['pg_core_saturation']:.2f} "
                          f"lg={s['loadgen_core_saturation']:.2f}]{flag}")
    finally:
        for v, p in procs.items():
            stop_server(p)

    # median across repeats
    agg = {}
    for s in raw:
        agg.setdefault((s["scenario"], s["variant"]), []).append(s)
    summary = []
    for (scen, var), runs in agg.items():
        med = {"scenario": scen, "variant": var, "connections": runs[0]["connections"],
               "repeats": len(runs)}
        for k in ("rps", "p50_us", "p90_us", "p95_us", "p99_us", "lat_mean_us",
                  "api_cpu_us_per_req", "pg_cpu_us_per_req", "pg_calls_per_req",
                  "pg_exec_ms_per_req", "bytes_per_req", "api_peak_rss_mb",
                  "api_core_saturation", "pg_core_saturation",
                  "loadgen_core_saturation", "api_cores_busy", "pg_cores_busy"):
            vals = [r[k] for r in runs if r.get(k) is not None]
            med[k] = round(statistics.median(vals), 3) if vals else None
        med["errors"] = sum(r[k] for r in runs for k in
                            ("errors_connect", "errors_read", "errors_write",
                             "errors_status", "errors_timeout"))
        summary.append(med)

    out = {
        "config": vars(args),
        "variant_labels": {k: v["label"] for k, v in VARIANTS.items() if k in variants},
        "raw": raw,
        "summary": summary,
    }
    with open(args.out, "w") as f:
        json.dump(out, f, indent=2)
    print(f"\nwrote {args.out}")


if __name__ == "__main__":
    main()
