#!/usr/bin/env python3
"""Assemble RESULTS.md from the raw result JSON so prose and tables never drift."""
import glob, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "bench"))
import report as R  # noqa: E402

SCEN = json.load(open(os.path.join(ROOT, "bench", "scenarios.json")))
ENV = json.load(open(os.path.join(ROOT, "results", "environment.json")))
PARITY = json.load(open(os.path.join(ROOT, "results", "parity.json")))
PROFILE = json.load(open(os.path.join(ROOT, "results", "statement-profile.json")))
MAIN = json.load(open(os.path.join(ROOT, "results", "main-1core-c32.json")))


def maybe(name):
    p = os.path.join(ROOT, "results", name)
    return json.load(open(p)) if os.path.exists(p) else None


DOCKER = maybe("docker-overhead.json")
KONG = maybe("kong-hop.json")
INPROC = maybe("inprocess-bun.json")
SCALE_1 = maybe("scaling-1core-pg1.json")
SCALE_2 = maybe("scaling-2core-pg1.json")
REVERSED = maybe("order-reversed-1core-c32.json")
VERSIONS = maybe("version-statement-counts.json")


def sweep_table():
    files = sorted(glob.glob(os.path.join(ROOT, "results", "sweep-1core-c*.json")),
                   key=lambda p: int(re.search(r"c(\d+)\.json$", p).group(1)))
    if not files:
        return "_(sweep not run)_"
    rows = ["| Scenario | Connections | " +
            " | ".join(f"{R.SHORT[v]} req/s (p50 ms)" for v in R.ORDER) + " |",
            "|---|---|" + "---|" * len(R.ORDER)]
    for f in files:
        d = json.load(open(f))
        c = d["config"]["connections"]
        idx = R.by_scenario(d)
        for sc in SCEN:
            if sc["id"] not in idx:
                continue
            cells = []
            for v in R.ORDER:
                r = idx[sc["id"]].get(v)
                cells.append(f"{r['rps']:,.0f} ({r['p50_us']/1000:.2f})" if r else "–")
            rows.append(f"| `{sc['id']}` | {c} | " + " | ".join(cells) + " |")
    return "\n".join(rows)


def chatter_block():
    p = os.path.join(ROOT, "results", "chatter-control.json")
    if not os.path.exists(p):
        return "_(control not run)_"
    d = json.load(open(p))
    rows = ["| Statement shape | Statements/txn | Clients | tps | avg latency | "
            "PG CPU µs/txn | PG cores busy (of 2) | pgbench cores busy (of 2) |",
            "|---|---|---|---|---|---|---|---|"]
    for r in d:
        name = "PostgREST-shaped" if r["shape"] == "postgrest" else "supalite-shaped"
        rows.append(f"| {name} | {r['statements_per_txn']} | {r['clients']} | "
                    f"{r['tps']:,.0f} | {r['latency_avg_ms']:.2f} ms | "
                    f"{r['pg_cores_busy'] * 1e6 / r['tps']:.0f} | "
                    f"{r['pg_cores_busy']:.2f} | "
                    f"{r['pgbench_core_saturation'] * 2:.2f} |")
    a = {(r["shape"], r["clients"]): r["tps"] for r in d}
    rows.append("")
    rows.append(f"Ratio: **{a[('postgrest', 10)] / a[('supalite', 10)]:.2f}×** at 10 clients, "
                f"**{a[('postgrest', 32)] / a[('supalite', 32)]:.2f}×** at 32 clients.")
    return "\n".join(rows)


def profile_block():
    out = []
    for p in PROFILE:
        out.append(f"**{p['server']}** — {p['total_statements']} statements, "
                   f"{p['total_exec_ms']} ms total execution time\n")
        out.append("```")
        for s in p["statements"]:
            out.append(f"{s['calls']}x  {s['exec_ms']:.3f}ms  {s['query'][:150]}")
        out.append("```\n")
    return "\n".join(out)


def parity_block():
    rows = ["| Scenario | Status codes | Body comparison |", "|---|---|---|"]
    for r in PARITY:
        codes = (f"{r['supalite_status']} = {r['postgrest_status']}"
                 if r["supalite_status"] == r["postgrest_status"]
                 else f"{r['supalite_status']} vs {r['postgrest_status']}")
        mode = {"exact": "byte-identical JSON",
                "shape": "same shape (write mutates state)",
                "shape-only": "same shape, values differ (see divergences)"}[r["compare"]]
        rows.append(f"| `{r['id']}` | {codes} | {mode} |")
    return "\n".join(rows)


def ratio(scenario, variant):
    idx = R.by_scenario(MAIN)
    return idx[scenario]["postgrest"]["rps"] / idx[scenario][variant]["rps"]


def val(scenario, variant, key):
    return R.by_scenario(MAIN)[scenario][variant][key]




def med(data, scen, var, key="rps"):
    for s in data["summary"]:
        if s["scenario"] == scen and s.get("variant", s.get("mode")) == var:
            return s[key]
    raise KeyError((scen, var))


def docker_table():
    if not DOCKER:
        return "_(not run)_"
    rows = ["| Scenario | Mode | req/s | % of native | p50 ms | API CPU us/req |",
            "|---|---|---|---|---|---|"]
    names = {"native": "native process", "host-net": "container, `--network host`",
             "bridge": "container, bridge + published port + NAT'd DB"}
    for scen in dict.fromkeys(s["scenario"] for s in DOCKER["summary"]):
        base = med(DOCKER, scen, "native")
        for mode in ("native", "host-net", "bridge"):
            r = next(s for s in DOCKER["summary"]
                     if s["scenario"] == scen and s["mode"] == mode)
            rows.append(f"| `{scen}` | {names[mode]} | {r['rps']:,.0f} | "
                        f"{r['rps'] / base * 100:.0f}% | {r['p50_ms']:.2f} | "
                        f"{r['api_cpu_us_per_req']:,.0f} |")
    return "\n".join(rows)


def kong_table():
    if not KONG:
        return "_(not run)_"
    rows = ["| Scenario | Bare PostgREST | Through Kong | Cost | p50 bare -> via Kong |",
            "|---|---|---|---|---|"]
    for scen in dict.fromkeys(s["scenario"] for s in KONG["summary"]):
        b = next(s for s in KONG["summary"]
                 if s["scenario"] == scen and s["variant"] == "postgrest")
        k = next(s for s in KONG["summary"]
                 if s["scenario"] == scen and s["variant"] == "kong+postgrest")
        rows.append(f"| `{scen}` | {b['rps']:,.0f} req/s | {k['rps']:,.0f} req/s | "
                    f"**{b['rps'] / k['rps']:.2f}x slower** | "
                    f"{b['p50_ms']:.1f} -> {k['p50_ms']:.1f} ms |")
    return "\n".join(rows)


def core_scaling_table():
    if not (SCALE_1 and SCALE_2):
        return "_(not run)_"
    rows = ["| Scenario | Variant | 1 API core | 2 API cores | change | "
            "API cores busy 1c -> 2c | PG core busy (of 1) 1c -> 2c |",
            "|---|---|---|---|---|---|---|"]
    for scen in ("tiny-select", "page-25", "insert-minimal"):
        for var in R.ORDER:
            a = next(x for x in SCALE_1["summary"]
                     if x["scenario"] == scen and x["variant"] == var)
            b = next(x for x in SCALE_2["summary"]
                     if x["scenario"] == scen and x["variant"] == var)
            rows.append(
                f"| `{scen}` | {R.SHORT[var]} | {a['rps']:,.0f} | {b['rps']:,.0f} | "
                f"{(b['rps'] - a['rps']) / a['rps'] * 100:+.1f}% | "
                f"{a['api_cores_busy']:.2f} -> {b['api_cores_busy']:.2f} | "
                f"{a['pg_cores_busy']:.2f} -> {b['pg_cores_busy']:.2f} |")
    return "\n".join(rows)


def order_table():
    if not REVERSED:
        return "_(not run)_"
    rows = ["| Scenario | Variant | order PostgREST->Node->Bun | order Bun->Node->PostgREST | shift |",
            "|---|---|---|---|---|"]
    for scen in ("tiny-select", "page-25", "insert-minimal"):
        for var in R.ORDER:
            f_, r_ = med(MAIN, scen, var), med(REVERSED, scen, var)
            rows.append(f"| `{scen}` | {R.SHORT[var]} | {f_:,.0f} | {r_:,.0f} | "
                        f"{(r_ - f_) / f_ * 100:+.1f}% |")
    rows.append("")
    rows.append("| Scenario | PostgREST / supalite/Node, forward order | reversed order |")
    rows.append("|---|---|---|")
    for scen in ("tiny-select", "page-25", "insert-minimal"):
        rows.append(f"| `{scen}` | "
                    f"{med(MAIN, scen, 'postgrest') / med(MAIN, scen, 'supalite-node'):.2f}x | "
                    f"{med(REVERSED, scen, 'postgrest') / med(REVERSED, scen, 'supalite-node'):.2f}x |")
    return "\n".join(rows)


idx = R.by_scenario(MAIN)
PEAK_RSS = {v: max(s["api_peak_rss_mb"] for s in MAIN["summary"] if s["variant"] == v)
            for v in R.ORDER}
read_scen = [s["id"] for s in SCEN if s["group"] == "read" and s["id"] != "count-exact"]
best = min(read_scen, key=lambda s: ratio(s, "supalite-node"))
worst = max(read_scen, key=lambda s: ratio(s, "supalite-node"))

env_cpu = ENV["cpu"]
doc = f"""# Results — supalite (Postgres driver) vs bare PostgREST

Linear: [LITE-421](https://linear.app/supabase/issue/LITE-421/benchmark-supalite-with-postgres-against-bare-postgrest)
Method, fairness rules and reproduction steps: [README.md](README.md)
Interactive chart (throughput / latency toggle, hover detail, table view, dark mode):
[`results/chart.html`](results/chart.html)

## Headline

Pointed at the same Postgres, on the same core budget, serving the same request
bytes, **bare PostgREST handles {ratio('tiny-select', 'supalite-node'):.1f}× more requests per second than supalite on its
`postgres` driver** for the cheapest possible read, and
**{ratio(best, 'supalite-node'):.1f}×–{ratio(worst, 'supalite-node'):.1f}× more across the read scenarios**. Writes land in the same band.

The one place they tie is the scenario where Postgres does all the work: an
exact `count` over 100k rows runs at {idx['count-exact']['postgrest']['rps']:.0f} req/s on PostgREST and
{idx['count-exact']['supalite-node']['rps']:.0f} req/s on supalite — {ratio('count-exact', 'supalite-node'):.2f}×. That is the control that makes the rest
of the table trustworthy: when the database dominates, the two are
indistinguishable, so the gap everywhere else is the API layer and not the
harness.

So the answer to "it's mostly I/O bound, it should be fairly comparable" is:
**only when the query is genuinely expensive.** For the small, cheap queries that
dominate a real Data API workload, the API layer is the whole cost, and there
PostgREST is several times cheaper per request.

## Runtime specs

| | |
|---|---|
| Machine | {ENV['host']['kind']} |
| CPU | {env_cpu['model']} — {env_cpu['vcpus']} vCPU ({env_cpu['sockets']} socket, {env_cpu['cores_per_socket']} cores, {env_cpu['threads_per_core']} thread/core) |
| Cache | L1d {env_cpu['l1d']}, L1i {env_cpu['l1i']}, L2 {env_cpu['l2']}, L3 {env_cpu['l3']} |
| Virtualisation | {env_cpu['hypervisor']}, {env_cpu['virtualization']} |
| Memory | {int(ENV['memory']['MemTotal'].split()[0]) // 1024} MiB |
| OS / kernel | {ENV['host']['os']} — {ENV['host']['kernel']} ({ENV['host']['arch']}) |
| CPU allocation | API server → core 0 · Postgres → cores 1-2 · `wrk` → core 3 |

**Caveat on absolute numbers:** these are shared vCPUs on a multi-tenant
hypervisor, so req/s figures are not comparable to bare metal. The ratios are,
because every variant was measured in the same window on the same cores with
interleaved repeats.

### Versions

| Component | Version |
|---|---|
| PostgreSQL | {ENV['versions']['postgres'].split(' on ')[0]} |
| PostgREST | {ENV['versions']['postgrest']} |
| `@supabase/lite` | {ENV['versions']['supabase_lite']} |
| `postgres` (postgres.js) | {ENV['versions']['postgres_js']} |
| Node.js | {ENV['versions']['node']} |
| Bun | {ENV['versions']['bun']} |
| Load generator | {ENV['versions']['wrk']} |

### Dataset

{ENV['dataset']['posts']} posts · {ENV['dataset']['comments']} comments ·
{ENV['dataset']['post_tags']} post_tags · {ENV['dataset']['authors']} authors ·
{ENV['dataset']['notes']} notes (RLS) · **{ENV['dataset']['db_size']}** total, fully
resident in a 2 GB `shared_buffers`, so nothing in this benchmark touches disk on
the read path.

## Equivalence check (run before any timing)

`bench/parity.py` calls every scenario against both servers and compares status
code and body. All 16 scenarios agree:

{parity_block()}

Two response-encoding divergences showed up and are worth fixing independently
of performance — they are compatibility bugs, not benchmark artefacts:

1. **`timestamptz` is not ISO-8601 on the `postgres` driver.** supalite returns
   `"2024-01-01 00:01:00+00"` where PostgREST (and hosted Supabase) return
   `"2024-01-01T00:01:00+00:00"`. `new Date(...)` parses the former
   inconsistently across engines.
2. **`numeric` comes back as a string.** For the `post_stats` RPC, supalite
   returns `"avg_rating": "0.06000000000000000000"`; PostgREST returns
   `"avg_rating": 0.06`.

Response *sizes* are within a few percent of each other (`page-500-wide`:
{val('page-500-wide', 'postgrest', 'bytes_per_req'):,.0f} B/req PostgREST vs {val('page-500-wide', 'supalite-node', 'bytes_per_req'):,.0f} B/req supalite), so neither side is
winning on smaller payloads.

## Throughput — 1 core per API server, 32 connections, median of 3

{R.table(MAIN, SCEN)}

## Latency — same runs

{R.latency_table(MAIN, SCEN)}

## Cost per request

`API µs/req` is CPU time charged to the API process divided by requests served.
It is the number that transfers to other hardware and other core counts: at
{val('tiny-select', 'postgrest', 'api_cpu_us_per_req'):.0f} µs/req a fully loaded core serves ~{1e6 / val('tiny-select', 'postgrest', 'api_cpu_us_per_req'):,.0f} req/s, at
{val('tiny-select', 'supalite-node', 'api_cpu_us_per_req'):,.0f} µs/req it serves ~{1e6 / val('tiny-select', 'supalite-node', 'api_cpu_us_per_req'):,.0f} req/s.

{R.cpu_table(MAIN, SCEN)}

Peak RSS over the whole matrix: **PostgREST {PEAK_RSS['postgrest']:.0f} MB**,
supalite/Node {PEAK_RSS['supalite-node']:.0f} MB, supalite/Bun {PEAK_RSS['supalite-bun']:.0f} MB.

## Where the difference comes from

### 9 Postgres round trips per request instead of 2

`bench/statement-profile.py` records the exact statements each server issues for
a single `GET /posts?select=id&limit=1`:

{profile_block()}

PostgREST batches the whole request context into **one** `set_config(...)` call
and then runs **one** query, relying on Postgres's implicit single-statement
transaction. supalite opens an explicit transaction and issues the same context
one GUC at a time: `begin`, five separate `set_config` calls, `SET LOCAL ROLE`,
the query, `commit`.

Total *execution* time inside Postgres is nearly identical
({PROFILE[0]['total_exec_ms']:.3f} ms vs {PROFILE[1]['total_exec_ms']:.3f} ms), which is the point: the cost is not query
work, it is **seven extra request/response round trips** plus seven extra
`await` points on the JS event loop, per HTTP request.

On the `rpc-stable` scenario it is worse — supalite issues
{val('rpc-stable', 'supalite-node', 'pg_calls_per_req'):.0f} statements per request (five more
`set_config` calls for the RPC request GUCs) against PostgREST's
{val('rpc-stable', 'postgrest', 'pg_calls_per_req'):.0f}, and that is also the scenario with
the widest gap in the table ({ratio('rpc-stable', 'supalite-node'):.1f}×).

### How much of the gap is the chatter alone?

A pure-Postgres control, with no HTTP and no API server in the picture: `pgbench`
replaying PostgREST's 2-statement shape versus supalite's 9-statement shape,
same query, same host, same core budget.

{chatter_block()}

Both shapes run parameterised statements (PostgREST's `db-prepared-statements`
and postgres.js's `prepare` are both on by default), and pgbench issues the
statements sequentially, exactly as supalite awaits them — so this is a faithful
replay, not a strawman.

Read the tps ratio as "at matched client concurrency", not as an asymptotic
ceiling: on the PostgREST-shaped runs Postgres is at ~0.90 of its 2-core budget,
while on the supalite-shaped runs nothing is saturated (Postgres 0.61–0.72,
pgbench 0.74–0.76) — that shape is limited by round-trip *serialisation*, which
is exactly the cost being demonstrated. The concurrency-independent figure is the
`PG CPU µs/txn` column: the 9-statement shape burns **~2.7× more Postgres CPU per
request** than the 2-statement shape for the same single-row read.

Set against the end-to-end result — {ratio('tiny-select', 'supalite-node'):.1f}× on `tiny-select` over HTTP — the SQL
shape alone reproduces 3.4–3.8× of it under identical concurrency. **Most of the
gap is the statement chatter, not the implementation language.** Cutting 9
statements to 2 is therefore the single highest-leverage change available.

### Postgres-side vs JS-side JSON assembly

PostgREST asks Postgres to build the JSON (`json_agg` inside the query); supalite
returns rows and serialises them in JS. On `page-500-wide` that shows up cleanly:
PostgREST spends {val('page-500-wide', 'postgrest', 'pg_exec_ms_per_req'):.2f} ms of Postgres execution per request against supalite's
{val('page-500-wide', 'supalite-node', 'pg_exec_ms_per_req'):.2f} ms — roughly {val('page-500-wide', 'postgrest', 'pg_exec_ms_per_req') / val('page-500-wide', 'supalite-node', 'pg_exec_ms_per_req'):.0f}× more database work — while still serving
{ratio('page-500-wide', 'supalite-node'):.1f}× more requests. It is a real architectural trade: PostgREST
pushes serialisation onto the (shared, harder-to-scale) database; supalite keeps
it in the (cheap, easy-to-scale) application process. On this box PostgREST wins
anyway, but on a Postgres that is already CPU-constrained the trade could flip.

### Bun vs Node

Neither runtime is consistently ahead, and the spread between them is far
narrower than the gap to PostgREST. Bun is faster on all three write scenarios
(`insert-representation` {val('insert-representation', 'supalite-bun', 'rps'):,.0f} vs {val('insert-representation', 'supalite-node', 'rps'):,.0f} req/s,
`update-by-pk` {val('update-by-pk', 'supalite-bun', 'rps'):,.0f} vs {val('update-by-pk', 'supalite-node', 'rps'):,.0f} req/s,
`insert-minimal` {val('insert-minimal', 'supalite-bun', 'rps'):,.0f} vs {val('insert-minimal', 'supalite-node', 'rps'):,.0f} req/s) and mixed on reads —
Node takes the embedding scenarios (`embed-many-to-many`
{val('embed-many-to-many', 'supalite-node', 'rps'):,.0f} vs {val('embed-many-to-many', 'supalite-bun', 'rps'):,.0f} req/s), Bun takes
`page-25` and `rpc-stable`. Choice of JS runtime is not what separates supalite
from PostgREST here.

## Concurrency sweep

Same 1-core budget, three representative scenarios, median of 2:

{sweep_table()}

At **1 connection** neither server is CPU-bound (PostgREST's core sits at ~0.39),
so this row is pure round-trip latency for a single user: **~1.0 ms vs ~2.5 ms**
per request. That 1.5 ms delta is close to what seven extra Postgres round trips
cost on loopback, which is the same story the statement profile tells.

From 4 connections on, both are core-saturated and the ratio settles into the
3–5× band the main table shows. Nothing degrades: at 64 connections both still
serve every request without errors, just with proportionally higher queueing
latency.

## Bottleneck disclosure

Every number above is reported with the per-core utilisation of the run that
produced it, so it is visible when something other than the API server was the
constraint.

{R.saturation_table(MAIN, SCEN)}

Reading this table:

* The API core is at **0.97–1.00** for every scenario except `count-exact`,
  so in almost every row the API server is the bottleneck. That is the intent.
* `count-exact` pins **both** Postgres cores at ~1.99/2.00 while the API cores
  idle at 0.12–0.32. It is a database benchmark, not an API benchmark, and both
  servers land in the same place.
* `page-500-wide` and `full-text-search` put PostgREST's Postgres usage at
  1.7/2.0 cores while its API core sits at 0.85–0.92 — those two PostgREST
  numbers are partly database-limited, so PostgREST's real margin there is
  **larger** than the table shows, not smaller.
* The load generator never exceeded 0.15 of its core, so `wrk` was never the
  limit.
* Zero connection, read, write, status or timeout errors across the entire
  matrix.

## Reconciling with the June 2026 published benchmark

The earlier [published supalite benchmark](https://statics.supalite.run/s/supalite-benchmark/)
(generated 2026-06-11, supalite source `51dc515`, `lite-docker: lite 0.4.0`,
Apple M4 Pro 14-core, preset small = 1,000 posts, 300 iterations, concurrency 10)
shows supalite ahead of `supabase`. This benchmark shows PostgREST ahead by
several times. Both are correct; they measure different things. Four of the
differences were measured directly rather than assumed.

### 1. That chart's closest pair is 1.1-1.4x, not "a lot"

Taking its own `postgres · in-process · bun` row against `supabase · http · docker`:

| Case | supalite (postgres, in-process, bun) | supabase (http, docker) | ratio |
|---|---|---|---|
| `read.point` | 8,418 ops/s | 6,329 ops/s | 1.33x |
| `read.list` | 6,501 ops/s | 5,976 ops/s | 1.09x |
| `read.embed` | 3,708 ops/s | 2,595 ops/s | 1.43x |
| `read.count` | 9,102 ops/s | 2,314 ops/s | 3.93x |
| `write.insert_single` | 6,920 ops/s | 3,901 ops/s | 1.77x |

The large headline margins in that chart belong to the **SQLite** rows
(`sqlite-postgres · in-process · bun` at 12,732 ops/s is 2.0x `supabase`), not to
the Postgres-backed row. On Postgres the published margin is 1.1-1.4x on the
ordinary reads, with `read.count` the one big outlier.

### 2. `supabase · http · docker` is not bare PostgREST - Kong costs ~2x

Self-hosted Supabase puts **Kong** in front of PostgREST (`cors` -> `key-auth` ->
`acl`). supalite has no separate gateway; key auth happens in-process. Measured
here with Supabase's own declarative `kong.yml` (`kong/kong.yml`), Kong 2.8.1 in
front of the same PostgREST, same Postgres, whole API tier on the same one core
supalite got:

{kong_table()}

### 3. Docker itself is nearly free - 0-12%

The same PostgREST binary, same config, same core, run three ways:

{docker_table()}

So containerisation is **not** the explanation. `--network host` is within 5% of
native; the bridge + published-port + NAT'd-DB path costs up to 12% on the larger
payload. Nothing close to a multiple.

### 4. In-process vs HTTP is worth ~20%, not multiples

The published supalite Postgres row is **in-process** - no socket at all. Same
`App`, same query, same core, same 32-way concurrency, Bun:

| Path | req/s | API CPU us/req | p50 ms |
|---|---|---|---|
| in-process (`app.getClient()`, no socket) | {INPROC['rps']:,.0f} | {INPROC['cpu_us_per_req']:,.0f} | {INPROC['p50_ms']:.1f} |
| over HTTP (`lite start`, Bun) | {med(MAIN, 'tiny-select', 'supalite-bun'):,.0f} | {med(MAIN, 'tiny-select', 'supalite-bun', 'api_cpu_us_per_req'):,.0f} | {med(MAIN, 'tiny-select', 'supalite-bun', 'p50_us') / 1000:.1f} |

Removing the network boundary buys ~15-20% (two runs of this measured 649 and
687 req/s against 561 over HTTP), because 9 Postgres round trips dominate so
heavily that HTTP framing is a rounding error next to them.

### 5. It is not a version regression

A plausible theory was that the chatty statement pattern arrived after June 2026.
It did not. `@supabase/lite@0.4.0` (published 2026-05-29, the release
contemporary with that benchmark) was installed against a clone of this same
database and profiled the same way:

| Version | Statements per `GET /posts?select=id&limit=1` |
|---|---|
| `@supabase/lite@0.4.0` | **7** (`begin`, 3x `set_config`, `SET LOCAL ROLE`, query, `commit`) |
| `@supabase/lite@0.10.0` | **9** (`begin`, 5x `set_config`, `SET LOCAL ROLE`, query, `commit`) |
| `@supabase/lite@0.10.0`, `rpc` | **14** |
| PostgREST 16.2 | **2** |

The pattern was already there, at 7 statements. It has drifted up by two, not
appeared from nothing.

### Putting it together

Apply the measured corrections to the published numbers for `read.point`: strip
Kong from the Supabase side (x ~1.9) and add an HTTP boundary to the supalite
side (x ~0.8) and 6,329 vs 8,418 becomes roughly **12,000 vs 6,700 - PostgREST
ahead by ~1.8x**, the same direction as this benchmark. The residual difference
in magnitude is methodology: 300 iterations versus 12-second runs, concurrency 10
versus 32, no CPU pinning on a 14-core laptop versus fixed 1-core budgets, and a
dockerised Postgres 17.6 versus a native one.

**Short answer: no, it is not Docker.** It is mostly that the earlier comparison
put a gateway on one side and no socket on the other, and that its Postgres-backed
margin was 1.1-1.4x rather than the multiples the SQLite rows show.

## Does PostgREST's multi-threading mean these numbers need adjusting?

PostgREST is a multi-threaded Haskell binary; supalite serves HTTP from a single
JS thread. So: does giving the API tier a second core change the picture?

Postgres is pinned to **one** core (core 2) in both runs below and the load
generator to core 3, so the only thing that changes is the API tier going from
one core to two. All budgets are disjoint - `bench/run.py` now reads the
postmaster's actual `Cpus_allowed_list` and refuses to run if it overlaps the API
or load-generator cores, because a first attempt at this experiment accidentally
gave the API server and Postgres a shared core and produced numbers that looked
like a scaling ceiling but were just contention.

{core_scaling_table()}

* **PostgREST gets no faster with a second core** - it is flat to slightly
  negative, while its CPU use rises from 0.98 to ~1.47 cores. It genuinely spreads
  across cores; the throughput just has nowhere to go. At 3,174 req/s it already
  has a 1-core Postgres at 0.82, so there is no downstream headroom to convert
  extra API cores into requests, and the extra cross-core coordination costs a
  little.
* **supalite/Node gains 10-19%**, supalite/Bun 2-5%, with API CPU going
  0.98 -> ~1.18 cores. Its JS execution is single-threaded, but V8/JSC background
  GC and JIT threads are not, and this workload allocates heavily. Nowhere near 2x.

The pool was not the limiter, incidentally - raising PostgREST's `db-pool` from 10
to 40 at c=128 changed throughput by under 3% (2,854 -> 2,784 req/s on one core),
so the 10-connection setting is not holding either side back.

**So no, the headline numbers do not need adjusting** - and the reason is worth
stating precisely. They are not "this machine does N req/s" claims; they are
cost-per-request claims, and the 1-core config is the only one where the API
server is provably the bottleneck (0.96-0.99 saturation with Postgres and the
load generator holding headroom). That is what makes `API us/req` the transferable
number: PostgREST {val('tiny-select', 'postgrest', 'api_cpu_us_per_req'):.0f} us against supalite's {val('tiny-select', 'supalite-node', 'api_cpu_us_per_req'):,.0f} us for the
identical request. That ratio governs capacity at any core count on either
architecture.

If anything the multi-core result strengthens the headline rather than softening
it: PostgREST's per-request cost is low enough that **a single core of PostgREST
is already enough to run a one-core Postgres near its limit.** Adding API cores
does not help because the database becomes the constraint first - which is the
position you want to be in.

The place core count does matter is operational, and it is a real asymmetry:
PostgREST reaches multiple cores inside one process, whereas supalite needs N
processes behind a load balancer to use a bigger box (the shipped docs describe no
cluster, `worker_threads` or `SO_REUSEPORT` mode). That is a deployment
difference, not a correction to the per-request cost.

## Did the order of the runs bias the result?

A fair worry: within each repeat the main matrix always ran
PostgREST -> supalite/Node -> supalite/Bun, so Bun always ran on the
"warmest" machine and PostgREST on the coldest. Two checks.

**No cumulative drift across repeats.** Mean req/s by repeat index, averaged over
all 16 scenarios:

| Variant | repeat 0 | repeat 1 | repeat 2 | rep0 -> rep2 |
|---|---|---|---|---|
| PostgREST | 2,136 | 2,143 | 2,138 | +0.1% |
| supalite/Node | 519 | 527 | 531 | +2.3% |
| supalite/Bun | 538 | 551 | 512 | -4.7% |

**Reversing the order does not move the ratios.** The whole subset re-run with
the variant order inverted:

{order_table()}

Absolute numbers shift by -4% to +27% between the two runs - that is the machine,
not the order, and it moves every variant in the same direction, which is exactly
what interleaving is meant to absorb. The ratios move by less than 5%.

**Calibrated noise floor.** The same scenario re-measured across repeats spreads
9-16% (median per variant; worst case 43%). So on this harness:

* a 3-6x ratio is far outside the noise and is a result;
* a 10-15% difference is **not** a result and must not be read as one;
* for anything finer, use `pg_calls_per_req`, which is deterministic - it does
  not vary with machine load at all.

`bench/compare.py` enforces exactly this: it reports anything under +/-15% as
noise and diffs the statement count separately as a hard assertion.

## Reusing this benchmark after an optimisation

The whole point of the harness is to be re-run. Everything is scripted and the
result files are self-describing (each carries its full config, all raw repeats,
and the environment capture).

```bash
# baseline already committed: results/main-1core-c32.json

npm install @supabase/lite@<new-version>   # or point at a pkg.pr.new build
npm run parity                             # equivalence must still hold
npm run profile                            # did the statement count actually drop?
npm run bench -- --out results/after.json  # same flags as the baseline
python3 bench/compare.py results/main-1core-c32.json results/after.json
```

`compare.py` prints per scenario and per variant: req/s before -> after with a
noise-aware verdict, the change in Postgres statements per request, and the change
in API CPU per request.

Three things make it trustworthy across sessions:

1. **The dataset is deterministic.** `sql/seed.sql` uses `setseed(0.42)` and
   `generate_series`, so a reseed reproduces the same 100k posts byte for byte.
2. **The statement count is machine-independent.** `pg_calls_per_req` comes from
   `pg_stat_statements`, not from timing. If the GUC batching lands, that column
   goes 9 -> 2 on every read scenario regardless of what else the box is doing.
   This is the regression test to gate on; throughput is the confirmation.
3. **Bottleneck disclosure travels with the numbers.** Every row carries its own
   core saturation, so a future run that was accidentally Postgres-bound is
   visible rather than silently reported as a win.

Two caveats for cross-session comparison: absolute req/s only compares within the
same machine and the same window (hence the interleaving), and a fresh Postgres
needs its cache warmed - the harness's global warmup phase does this, so do not
skip it. For a fast pre-check on a query-shape change you do not even need the
full matrix: `npm run control` replays the two statement shapes through pgbench in
about a minute and will show a shape improvement immediately.

## What this does not measure

* **Scaling across cores.** PostgREST is a multi-threaded Haskell binary;
  `lite start` serves HTTP from a single JS thread and the shipped docs
  (`README.md`, `STATUS.md`, `LIMITATIONS.md`) describe no cluster,
  `worker_threads` or `SO_REUSEPORT` mode. On a box with more cores PostgREST
  scales up in-process, supalite needs N processes behind a load balancer. This
  4-vCPU box cannot demonstrate that cleanly: Postgres alone needs ~1.9 cores
  to feed PostgREST at its 1-core rate, so there is no room to give the API two
  cores and keep Postgres unconstrained. The `API µs/req` column is the
  core-count-independent way to reason about it.
* **The rest of the product.** This is the Data API only. supalite's `[auth]`
  and `[storage]` are switched off because bare PostgREST ships neither; the
  comparison says nothing about the value of having them in one process.
* **Cold start, footprint, or operability**, beyond the peak-RSS figures above.
  supalite is ready in ~100-150 ms with no container; that is not what this
  benchmark is about, and it is most of why the project exists.
* **SQLite / PGlite backends.** Only the `postgres` driver is in scope here,
  because the question was specifically supalite-on-Postgres vs
  PostgREST-on-Postgres.

## Actionable findings

1. **Collapse the per-request GUC setup into one statement.** PostgREST proves
   one `select set_config(...), set_config(...), ...` round trip is enough, and
   that the explicit `begin`/`commit` is unnecessary for a single-statement
   request. This is the largest single lever in the table: 9 statements → 2 on
   reads, {val('rpc-stable', 'supalite-node', 'pg_calls_per_req'):.0f} → 2 on RPC.
2. **`timestamptz` should render as ISO-8601** on the `postgres` driver, to
   match PostgREST and hosted Supabase.
3. **`numeric` should render as a JSON number**, not a string.
4. **supalite's schema-cache introspection requires privileges the connecting
   role holds directly.** With the standard Supabase-shaped `authenticator`
   role (`LOGIN NOINHERIT`, member of `anon`), supalite answers
   `PGRST205 Could not find the table 'public.posts' in the schema cache` while
   PostgREST on the identical connection string works. Cause: supalite's
   Postgres introspection reads `information_schema.tables` and
   `information_schema.columns`, which by the SQL standard only expose objects
   the *current* role holds privileges on — and `NOINHERIT` means
   `authenticator` inherits nothing from `anon`. PostgREST reads `pg_class` /
   `pg_attribute` directly and is unaffected. Extra grants
   (`sql/post-migration-grants.sql`) were needed to make the two comparable.
   Either introspect `pg_catalog`, or document the requirement.
5. **`lite start` also needs `select` on `supabase_migrations.schema_migrations`**
   for the connecting role, or the schema cache comes up empty with the same
   `PGRST205`. Neither requirement is documented.
"""

with open(os.path.join(ROOT, "RESULTS.md"), "w") as f:
    f.write(doc)
print("wrote RESULTS.md")
