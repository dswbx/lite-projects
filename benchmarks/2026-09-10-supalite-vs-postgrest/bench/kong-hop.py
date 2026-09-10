#!/usr/bin/env python3
"""What does the Supabase gateway hop cost?

Self-hosted Supabase does not expose PostgREST directly: requests go through
Kong (cors -> key-auth -> acl) first. supalite has no separate gateway — key
auth happens inside the same process. This measures that difference with the
same PostgREST, the same Postgres and the same one-core budget for the whole
API tier, which is the budget supalite got in the main matrix.

  postgrest        wrk -> PostgREST (core 0)
  kong+postgrest   wrk -> Kong (core 0) -> PostgREST (core 0)

Kong runs with --network host so this measures the gateway itself, not a second
layer of bridge NAT; bridge NAT is measured separately in docker-overhead.py.
"""
import json, os, statistics, subprocess, sys, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "bench"))
import run as H  # noqa: E402

APIKEY = H.APIKEY
KONG_IMAGE = "mirror.gcr.io/library/kong:2.8.1"
API_CPUS, PG_CPUS, LG_CPUS = "0", "1,2", "3"
CPUSETS = {"api": H.parse_cpuset(API_CPUS), "pg": H.parse_cpuset(PG_CPUS),
           "loadgen": H.parse_cpuset(LG_CPUS)}
CONNS, DURATION, WARMUP, REPEATS = 32, 10, 3, 2
SCENARIOS = [s for s in json.load(open(os.path.join(ROOT, "bench", "scenarios.json")))
             if s["id"] in ("tiny-select", "page-25", "insert-minimal")]

# a Kong-fronted variant, so the exact same wrk driver and scenario table apply
H.VARIANTS["kong+postgrest"] = {
    "label": "Kong 2.8.1 -> PostgREST 16.2 (Supabase self-hosted topology)",
    "base": "http://127.0.0.1:8000/rest/v1",
    "prefix": "/rest/v1",
    "headers": [f"apikey: {APIKEY}"],
    "cmd": lambda cpus: None,
    "probe": "http://127.0.0.1:8000/rest/v1/posts?select=id&limit=1",
}


def render_kong_config():
    """Render kong/kong.yml from the committed template.

    The rendered file carries the project's API keys, so it is gitignored and
    regenerated here instead of being checked in.
    """
    tpl = os.path.join(ROOT, "kong", "kong.yml.template")
    out = os.path.join(ROOT, "kong", "kong.yml")
    secret = next(l.strip().split("=", 1)[1] for l in open(os.path.join(ROOT, ".env"))
                  if l.startswith("SUPABASE_SECRET_KEY="))
    body = (open(tpl).read()
            .replace("__SUPABASE_PUBLISHABLE_KEY__", APIKEY)
            .replace("__SUPABASE_SECRET_KEY__", secret))
    open(out, "w").write(body)
    return out


def rm_kong():
    subprocess.run(["docker", "rm", "-f", "kong-bench"], capture_output=True, text=True)


def start_kong():
    rm_kong()
    render_kong_config()
    r = subprocess.run([
        "docker", "run", "-d", "--name", "kong-bench",
        "--cpuset-cpus", API_CPUS, "--network", "host",
        "-v", f"{ROOT}/kong/kong.yml:/kong.yml:ro",
        "-e", "KONG_DATABASE=off",
        "-e", "KONG_DECLARATIVE_CONFIG=/kong.yml",
        "-e", "KONG_PROXY_LISTEN=127.0.0.1:8000",
        "-e", "KONG_ADMIN_LISTEN=127.0.0.1:8001",
        "-e", "KONG_NGINX_WORKER_PROCESSES=1",
        "-e", "KONG_LOG_LEVEL=error",
        "-e", "KONG_PLUGINS=request-transformer,cors,key-auth,acl,basic-auth",
        "-e", "KONG_DNS_ORDER=LAST,A,CNAME",
        KONG_IMAGE,
    ], capture_output=True, text=True)
    if r.returncode:
        raise RuntimeError(r.stderr)
    for _ in range(120):
        c = subprocess.run(["curl", "-sf", "-o", "/dev/null", "-H", f"apikey: {APIKEY}",
                            H.VARIANTS["kong+postgrest"]["probe"]])
        if c.returncode == 0:
            return
        time.sleep(0.5)
    logs = subprocess.run(["docker", "logs", "--tail", "40", "kong-bench"],
                          capture_output=True, text=True)
    raise RuntimeError(f"kong did not come up:\n{logs.stdout}{logs.stderr}")


def measure(variant, sc):
    tmp = "/tmp/bench-run/wrk-kong.json"
    if os.path.exists(tmp):
        os.remove(tmp)
    H.wrk_run(variant, sc, CONNS, WARMUP, 1, LG_CPUS, tmp)
    os.remove(tmp)
    c0, t0 = H.cpu_core_ticks(), time.time()
    stats = H.wrk_run(variant, sc, CONNS, DURATION, 1, LG_CPUS, tmp)
    c1, t1 = H.cpu_core_ticks(), time.time()
    os.remove(tmp)
    wall = t1 - t0
    api = H.core_busy_seconds(c0, c1, CPUSETS["api"])
    return {
        "variant": variant, "scenario": sc["id"], "rps": stats["rps"],
        "p50_ms": round(stats["p50_us"] / 1000, 3),
        "p99_ms": round(stats["p99_us"] / 1000, 3),
        "api_tier_cpu_us_per_req": round(api * 1e6 / stats["requests"], 1),
        "api_core_saturation": round(api / (wall * len(CPUSETS["api"])), 3),
        "pg_cores_busy": round(H.core_busy_seconds(c0, c1, CPUSETS["pg"]) / wall, 3),
        "loadgen_core_saturation": round(
            H.core_busy_seconds(c0, c1, CPUSETS["loadgen"]) / (wall * len(CPUSETS["loadgen"])), 3),
        "errors": sum(stats[k] for k in ("errors_connect", "errors_read", "errors_write",
                                         "errors_status", "errors_timeout")),
    }


raw = []
pgrst = None
try:
    H.kill_stale_servers()
    rm_kong()
    pgrst = H.start_server("postgrest", API_CPUS)
    print("  postgrest up (core 0)")
    start_kong()
    print("  kong up (core 0, 1 nginx worker, host network)")
    for rep in range(REPEATS):
        for sc in SCENARIOS:
            for variant in ("postgrest", "kong+postgrest"):
                r = measure(variant, sc)
                r["repeat"] = rep
                raw.append(r)
                print(f"  {variant:15} {sc['id']:16} rep{rep}  {r['rps']:8.1f} rps  "
                      f"p50={r['p50_ms']:6.2f}ms p99={r['p99_ms']:7.2f}ms  "
                      f"tier_cpu={r['api_tier_cpu_us_per_req']:7.1f}us/req  "
                      f"sat[api={r['api_core_saturation']:.2f} pg={r['pg_cores_busy']:.2f}] "
                      f"err={r['errors']}")
finally:
    rm_kong()
    H.stop_server(pgrst)

summary = []
for sc in SCENARIOS:
    for variant in ("postgrest", "kong+postgrest"):
        rs = [r for r in raw if r["scenario"] == sc["id"] and r["variant"] == variant]
        if rs:
            summary.append({
                "scenario": sc["id"], "variant": variant,
                **{k: round(statistics.median(r[k] for r in rs), 3)
                   for k in ("rps", "p50_ms", "p99_ms", "api_tier_cpu_us_per_req",
                             "api_core_saturation", "pg_cores_busy")},
                "errors": sum(r["errors"] for r in rs),
            })

json.dump({"kong_image": KONG_IMAGE,
           "config": {"connections": CONNS, "duration_s": DURATION, "warmup_s": WARMUP,
                      "repeats": REPEATS, "api_cpus": API_CPUS, "pg_cpus": PG_CPUS,
                      "loadgen_cpus": LG_CPUS,
                      "note": "Kong and PostgREST share core 0 — the whole API tier gets "
                              "the same 1-core budget supalite got in the main matrix"},
           "raw": raw, "summary": summary},
          open(os.path.join(ROOT, "results", "kong-hop.json"), "w"), indent=2)

print("\nmedians:")
for sc in SCENARIOS:
    b = next(s for s in summary if s["scenario"] == sc["id"] and s["variant"] == "postgrest")
    k = next(s for s in summary if s["scenario"] == sc["id"] and s["variant"] == "kong+postgrest")
    print(f"  {sc['id']:16} bare {b['rps']:8.1f} -> via Kong {k['rps']:8.1f} rps  "
          f"({k['rps'] / b['rps'] * 100:5.1f}%, {b['rps'] / k['rps']:.2f}x slower)  "
          f"p50 {b['p50_ms']:.2f} -> {k['p50_ms']:.2f} ms")
print("\nwrote results/kong-hop.json")
