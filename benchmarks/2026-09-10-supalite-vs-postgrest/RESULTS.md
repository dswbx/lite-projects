# Results — supalite (Postgres driver) vs bare PostgREST

Linear: [LITE-421](https://linear.app/supabase/issue/LITE-421/benchmark-supalite-with-postgres-against-bare-postgrest)
Method, fairness rules and reproduction steps: [README.md](README.md)
Interactive chart (throughput / latency toggle, hover detail, table view, dark mode):
[`results/chart.html`](results/chart.html)

## Headline

Pointed at the same Postgres, on the same core budget, serving the same request
bytes, **bare PostgREST handles 4.3× more requests per second than supalite on its
`postgres` driver** for the cheapest possible read, and
**2.9×–6.2× more across the read scenarios**. Writes land in the same band.

The one place they tie is the scenario where Postgres does all the work: an
exact `count` over 100k rows runs at 113 req/s on PostgREST and
108 req/s on supalite — 1.05×. That is the control that makes the rest
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
| Machine | Claude Code on the web sandbox VM (KVM guest) |
| CPU | Intel(R) Xeon(R) Processor @ 2.10GHz — 4 vCPU (1 socket, 4 cores, 1 thread/core) |
| Cache | L1d 192 KiB (4 instances), L1i 128 KiB (4 instances), L2 8 MiB (4 instances), L3 260 MiB (1 instance) |
| Virtualisation | KVM, full |
| Memory | 16075 MiB |
| OS / kernel | Ubuntu 24.04.4 LTS — 6.18.44-fc-v24 (x86_64) |
| CPU allocation | API server → core 0 · Postgres → cores 1-2 · `wrk` → core 3 |

**Caveat on absolute numbers:** these are shared vCPUs on a multi-tenant
hypervisor, so req/s figures are not comparable to bare metal. The ratios are,
because every variant was measured in the same window on the same cores with
interleaved repeats.

### Versions

| Component | Version |
|---|---|
| PostgreSQL | PostgreSQL 16.13 (Ubuntu 16.13-0ubuntu0.24.04.1) |
| PostgREST | PostgREST 16.2 |
| `@supabase/lite` | 0.10.0 |
| `postgres` (postgres.js) | 3.4.9 |
| Node.js | v22.22.2 |
| Bun | 1.3.11 |
| Load generator | wrk debian/4.1.0-4build2 [epoll] Copyright (C) 2012 Will Glozer |

### Dataset

100000 posts · 400000 comments ·
292000 post_tags · 2000 authors ·
50000 notes (RLS) · **152 MB** total, fully
resident in a 2 GB `shared_buffers`, so nothing in this benchmark touches disk on
the read path.

## Equivalence check (run before any timing)

`bench/parity.py` calls every scenario against both servers and compares status
code and body. All 16 scenarios agree:

| Scenario | Status codes | Body comparison |
|---|---|---|
| `tiny-select` | 200 = 200 | byte-identical JSON |
| `point-lookup` | 200 = 200 | same shape, values differ (see divergences) |
| `page-25` | 200 = 200 | same shape, values differ (see divergences) |
| `page-500-wide` | 200 = 200 | byte-identical JSON |
| `filter-order` | 200 = 200 | byte-identical JSON |
| `in-list-50` | 200 = 200 | byte-identical JSON |
| `embed-many-to-one` | 200 = 200 | byte-identical JSON |
| `embed-one-to-many` | 200 = 200 | byte-identical JSON |
| `embed-many-to-many` | 200 = 200 | byte-identical JSON |
| `count-exact` | 206 = 206 | byte-identical JSON |
| `full-text-search` | 200 = 200 | byte-identical JSON |
| `rls-read` | 200 = 200 | byte-identical JSON |
| `rpc-stable` | 200 = 200 | same shape, values differ (see divergences) |
| `insert-minimal` | 201 = 201 | same shape (write mutates state) |
| `insert-representation` | 201 = 201 | same shape (write mutates state) |
| `update-by-pk` | 204 = 204 | same shape (write mutates state) |

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
147,598 B/req PostgREST vs 146,211 B/req supalite), so neither side is
winning on smaller payloads.

## Throughput — 1 core per API server, 32 connections, median of 3

| Scenario | PostgREST req/s | supalite/Node req/s | supalite/Bun req/s | ratio vs PostgREST |
|---|---|---|---|---|
| `tiny-select` | 2,968 | 693 | 561 | Node 4.28×, Bun 5.29× |
| `point-lookup` | 2,788 | 666 | 672 | Node 4.19×, Bun 4.15× |
| `page-25` | 2,253 | 639 | 661 | Node 3.53×, Bun 3.41× |
| `page-500-wide` | 1,206 | 245 | 253 | Node 4.92×, Bun 4.76× |
| `filter-order` | 2,190 | 642 | 640 | Node 3.41×, Bun 3.42× |
| `in-list-50` | 2,133 | 599 | 543 | Node 3.56×, Bun 3.93× |
| `embed-many-to-one` | 1,920 | 576 | 508 | Node 3.33×, Bun 3.78× |
| `embed-one-to-many` | 1,835 | 472 | 465 | Node 3.89×, Bun 3.95× |
| `embed-many-to-many` | 1,520 | 467 | 389 | Node 3.25×, Bun 3.91× |
| `count-exact` | 113 | 108 | 110 | Node 1.05×, Bun 1.02× |
| `full-text-search` | 1,750 | 606 | 570 | Node 2.89×, Bun 3.07× |
| `rls-read` | 2,653 | 662 | 667 | Node 4.01×, Bun 3.98× |
| `rpc-stable` | 3,025 | 490 | 580 | Node 6.17×, Bun 5.22× |
| `insert-minimal` | 2,880 | 618 | 661 | Node 4.66×, Bun 4.35× |
| `insert-representation` | 2,415 | 477 | 690 | Node 5.07×, Bun 3.50× |
| `update-by-pk` | 2,820 | 581 | 700 | Node 4.85×, Bun 4.03× |

## Latency — same runs

| Scenario | PostgREST p50 / p99 (ms) | supalite/Node p50 / p99 (ms) | supalite/Bun p50 / p99 (ms) |
|---|---|---|---|
| `tiny-select` | 10.4 / 21.6 | 44.3 / 90.6 | 54.3 / 107.2 |
| `point-lookup` | 11.2 / 18.7 | 46.8 / 79.2 | 43.1 / 100.7 |
| `page-25` | 13.9 / 23.4 | 47.7 / 93.2 | 46.5 / 84.6 |
| `page-500-wide` | 26.8 / 39.8 | 133.8 / 167.7 | 122.8 / 183.0 |
| `filter-order` | 14.4 / 24.2 | 47.8 / 93.1 | 48.1 / 79.4 |
| `in-list-50` | 14.6 / 25.0 | 51.3 / 101.9 | 55.8 / 109.7 |
| `embed-many-to-one` | 17.2 / 32.8 | 53.7 / 99.8 | 60.1 / 106.4 |
| `embed-one-to-many` | 17.3 / 33.7 | 64.3 / 119.5 | 66.1 / 104.7 |
| `embed-many-to-many` | 21.4 / 39.7 | 65.4 / 121.4 | 78.2 / 149.7 |
| `count-exact` | 276.3 / 453.6 | 290.4 / 397.7 | 285.8 / 400.6 |
| `full-text-search` | 18.5 / 27.9 | 51.0 / 96.6 | 52.9 / 124.6 |
| `rls-read` | 11.8 / 21.2 | 46.7 / 92.3 | 46.5 / 75.7 |
| `rpc-stable` | 10.3 / 17.9 | 62.9 / 115.2 | 52.1 / 111.8 |
| `insert-minimal` | 10.7 / 20.2 | 49.1 / 105.1 | 44.9 / 95.5 |
| `insert-representation` | 12.8 / 23.7 | 64.7 / 139.6 | 44.4 / 76.8 |
| `update-by-pk` | 11.1 / 18.7 | 51.6 / 122.5 | 44.1 / 76.2 |

## Cost per request

`API µs/req` is CPU time charged to the API process divided by requests served.
It is the number that transfers to other hardware and other core counts: at
331 µs/req a fully loaded core serves ~3,023 req/s, at
1,408 µs/req it serves ~710 req/s.

| Scenario | PostgREST API µs/req | supalite/Node API µs/req | supalite/Bun API µs/req | PG stmts/req (PostgREST → supalite) | PG exec ms/req (PostgREST → supalite) |
|---|---|---|---|---|---|
| `tiny-select` | 331 | 1,408 | 1,725 | 2.00 → 9.03 | 0.025 → 0.049 |
| `point-lookup` | 357 | 1,460 | 1,461 | 2.00 → 9.04 | 0.040 → 0.065 |
| `page-25` | 442 | 1,525 | 1,503 | 2.00 → 9.04 | 0.071 → 0.069 |
| `page-500-wide` | 747 | 4,032 | 3,898 | 2.00 → 9.11 | 1.641 → 0.338 |
| `filter-order` | 454 | 1,524 | 1,546 | 2.00 → 9.04 | 0.075 → 0.084 |
| `in-list-50` | 463 | 1,633 | 1,829 | 2.00 → 9.04 | 0.098 → 0.106 |
| `embed-many-to-one` | 509 | 1,703 | 1,947 | 2.00 → 9.04 | 0.170 → 0.131 |
| `embed-one-to-many` | 542 | 2,028 | 2,124 | 2.00 → 9.05 | 0.205 → 0.188 |
| `embed-many-to-many` | 640 | 2,060 | 2,497 | 2.00 → 9.05 | 0.403 → 0.323 |
| `count-exact` | 795 | 2,263 | 2,962 | 2.05 → 10.27 | 74.617 → 71.433 |
| `full-text-search` | 487 | 1,555 | 1,679 | 2.00 → 9.05 | 0.934 → 0.830 |
| `rls-read` | 372 | 1,482 | 1,487 | 2.00 → 9.04 | 0.052 → 0.062 |
| `rpc-stable` | 327 | 1,996 | 1,686 | 2.00 → 14.08 | 0.083 → 0.148 |
| `insert-minimal` | 343 | 1,573 | 1,495 | 2.00 → 9.04 | 0.058 → 0.077 |
| `insert-representation` | 412 | 2,030 | 1,436 | 2.00 → 9.05 | 0.091 → 0.111 |
| `update-by-pk` | 353 | 1,653 | 1,415 | 2.00 → 9.04 | 0.081 → 0.095 |

Peak RSS over the whole matrix: **PostgREST 48 MB**,
supalite/Node 207 MB, supalite/Bun 186 MB.

## Where the difference comes from

### 9 Postgres round trips per request instead of 2

`bench/statement-profile.py` records the exact statements each server issues for
a single `GET /posts?select=id&limit=1`:

**postgrest** — 2 statements, 0.045 ms total execution time

```
1x  0.024ms  WITH pgrst_source AS ( SELECT "public"."posts"."id" FROM "public"."posts" LIMIT $1 OFFSET $2 ) SELECT $3::bigint AS total_result_set, pg_catalog.count
1x  0.021ms  select set_config('search_path', $1, true), set_config('role', $2, true), set_config('request.jwt.claims', $3, true), set_config('request.method', $4,
```

**supalite-node** — 9 statements, 0.071 ms total execution time

```
5x  0.045ms  SELECT set_config($2, $1, $3)
1x  0.012ms  SET LOCAL ROLE "anon"
1x  0.002ms  begin
1x  0.001ms  commit
1x  0.011ms  select "id" from "posts" limit $1
```

**supalite-bun** — 9 statements, 0.079 ms total execution time

```
5x  0.049ms  SELECT set_config($2, $1, $3)
1x  0.014ms  SET LOCAL ROLE "anon"
1x  0.002ms  begin
1x  0.001ms  commit
1x  0.013ms  select "id" from "posts" limit $1
```


PostgREST batches the whole request context into **one** `set_config(...)` call
and then runs **one** query, relying on Postgres's implicit single-statement
transaction. supalite opens an explicit transaction and issues the same context
one GUC at a time: `begin`, five separate `set_config` calls, `SET LOCAL ROLE`,
the query, `commit`.

Total *execution* time inside Postgres is nearly identical
(0.045 ms vs 0.071 ms), which is the point: the cost is not query
work, it is **seven extra request/response round trips** plus seven extra
`await` points on the JS event loop, per HTTP request.

On the `rpc-stable` scenario it is worse — supalite issues
14 statements per request (five more
`set_config` calls for the RPC request GUCs) against PostgREST's
2, and that is also the scenario with
the widest gap in the table (6.2×).

### How much of the gap is the chatter alone?

A pure-Postgres control, with no HTTP and no API server in the picture: `pgbench`
replaying PostgREST's 2-statement shape versus supalite's 9-statement shape,
same query, same host, same core budget.

| Statement shape | Statements/txn | Clients | tps | avg latency | PG CPU µs/txn | PG cores busy (of 2) | pgbench cores busy (of 2) |
|---|---|---|---|---|---|---|---|
| PostgREST-shaped | 2 | 10 | 11,187 | 0.89 ms | 163 | 1.82 | 1.24 |
| PostgREST-shaped | 2 | 32 | 11,784 | 2.72 ms | 153 | 1.80 | 1.30 |
| supalite-shaped | 9 | 10 | 2,942 | 3.40 ms | 416 | 1.22 | 1.48 |
| supalite-shaped | 9 | 32 | 3,510 | 9.12 ms | 410 | 1.44 | 1.53 |

Ratio: **3.80×** at 10 clients, **3.36×** at 32 clients.

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

Set against the end-to-end result — 4.3× on `tiny-select` over HTTP — the SQL
shape alone reproduces 3.4–3.8× of it under identical concurrency. **Most of the
gap is the statement chatter, not the implementation language.** Cutting 9
statements to 2 is therefore the single highest-leverage change available.

### Postgres-side vs JS-side JSON assembly

PostgREST asks Postgres to build the JSON (`json_agg` inside the query); supalite
returns rows and serialises them in JS. On `page-500-wide` that shows up cleanly:
PostgREST spends 1.64 ms of Postgres execution per request against supalite's
0.34 ms — roughly 5× more database work — while still serving
4.9× more requests. It is a real architectural trade: PostgREST
pushes serialisation onto the (shared, harder-to-scale) database; supalite keeps
it in the (cheap, easy-to-scale) application process. On this box PostgREST wins
anyway, but on a Postgres that is already CPU-constrained the trade could flip.

### Bun vs Node

Neither runtime is consistently ahead, and the spread between them is far
narrower than the gap to PostgREST. Bun is faster on all three write scenarios
(`insert-representation` 690 vs 477 req/s,
`update-by-pk` 700 vs 581 req/s,
`insert-minimal` 661 vs 618 req/s) and mixed on reads —
Node takes the embedding scenarios (`embed-many-to-many`
467 vs 389 req/s), Bun takes
`page-25` and `rpc-stable`. Choice of JS runtime is not what separates supalite
from PostgREST here.

## Concurrency sweep

Same 1-core budget, three representative scenarios, median of 2:

| Scenario | Connections | PostgREST req/s (p50 ms) | supalite/Node req/s (p50 ms) | supalite/Bun req/s (p50 ms) |
|---|---|---|---|---|
| `tiny-select` | 1 | 922 (1.01) | 349 (2.55) | 342 (2.50) |
| `page-25` | 1 | 632 (1.48) | 317 (2.84) | 317 (2.75) |
| `insert-minimal` | 1 | 988 (0.94) | 313 (2.86) | 342 (2.49) |
| `tiny-select` | 4 | 2,905 (1.31) | 635 (5.61) | 679 (5.22) |
| `page-25` | 4 | 1,916 (1.99) | 583 (6.24) | 543 (7.03) |
| `insert-minimal` | 4 | 2,705 (1.40) | 576 (6.18) | 698 (5.26) |
| `tiny-select` | 16 | 2,940 (5.30) | 658 (22.73) | 675 (21.92) |
| `page-25` | 16 | 2,120 (7.24) | 641 (23.81) | 614 (24.26) |
| `insert-minimal` | 16 | 2,792 (5.49) | 537 (28.63) | 633 (24.64) |
| `tiny-select` | 64 | 2,765 (22.47) | 495 (125.80) | 543 (106.87) |
| `page-25` | 64 | 1,936 (32.38) | 609 (103.44) | 580 (108.09) |
| `insert-minimal` | 64 | 2,960 (20.89) | 605 (102.41) | 769 (80.23) |

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

| Scenario | Variant | API core busy | PG cores busy (of 2) | wrk core busy | errors |
|---|---|---|---|---|---|
| `tiny-select` | PostgREST | 1.00 | 0.94 | 0.14 | 0 |
| `tiny-select` | supalite/Node | 0.99 | 0.68 | 0.09 | 0 |
| `tiny-select` | supalite/Bun | 0.98 | 0.70 | 0.11 | 0 |
| `point-lookup` | PostgREST | 1.00 | 0.77 | 0.12 | 0 |
| `point-lookup` | supalite/Node | 0.99 | 0.67 | 0.10 | 0 |
| `point-lookup` | supalite/Bun | 0.98 | 0.66 | 0.08 | 0 |
| `page-25` | PostgREST | 1.00 | 0.93 | 0.10 | 0 |
| `page-25` | supalite/Node | 0.99 | 0.62 | 0.08 | 0 |
| `page-25` | supalite/Bun | 0.99 | 0.63 | 0.07 | 0 |
| `page-500-wide` | PostgREST | 0.92 | 1.74 | 0.11 | 0 |
| `page-500-wide` | supalite/Node | 1.00 | 0.39 | 0.05 | 0 |
| `page-500-wide` | supalite/Bun | 0.99 | 0.40 | 0.07 | 0 |
| `filter-order` | PostgREST | 1.00 | 0.98 | 0.12 | 0 |
| `filter-order` | supalite/Node | 1.00 | 0.64 | 0.08 | 0 |
| `filter-order` | supalite/Bun | 0.99 | 0.64 | 0.08 | 0 |
| `in-list-50` | PostgREST | 1.00 | 0.75 | 0.11 | 0 |
| `in-list-50` | supalite/Node | 0.99 | 0.61 | 0.08 | 0 |
| `in-list-50` | supalite/Bun | 0.99 | 0.60 | 0.07 | 0 |
| `embed-many-to-one` | PostgREST | 0.99 | 1.39 | 0.10 | 0 |
| `embed-many-to-one` | supalite/Node | 0.99 | 0.65 | 0.09 | 0 |
| `embed-many-to-one` | supalite/Bun | 0.99 | 0.62 | 0.07 | 0 |
| `embed-one-to-many` | PostgREST | 1.00 | 1.22 | 0.12 | 0 |
| `embed-one-to-many` | supalite/Node | 0.98 | 0.73 | 0.12 | 0 |
| `embed-one-to-many` | supalite/Bun | 0.99 | 0.64 | 0.08 | 0 |
| `embed-many-to-many` | PostgREST | 0.97 | 1.50 | 0.12 | 0 |
| `embed-many-to-many` | supalite/Node | 0.98 | 0.79 | 0.10 | 0 |
| `embed-many-to-many` | supalite/Bun | 0.98 | 0.72 | 0.10 | 0 |
| `count-exact` | PostgREST | 0.12 | 1.99 | 0.03 | 0 |
| `count-exact` | supalite/Node | 0.24 | 1.95 | 0.03 | 0 |
| `count-exact` | supalite/Bun | 0.32 | 1.97 | 0.04 | 0 |
| `full-text-search` | PostgREST | 0.85 | 1.72 | 0.10 | 0 |
| `full-text-search` | supalite/Node | 0.96 | 0.94 | 0.10 | 0 |
| `full-text-search` | supalite/Bun | 0.95 | 0.91 | 0.09 | 0 |
| `rls-read` | PostgREST | 1.00 | 0.98 | 0.12 | 0 |
| `rls-read` | supalite/Node | 1.00 | 0.62 | 0.08 | 0 |
| `rls-read` | supalite/Bun | 0.99 | 0.65 | 0.07 | 0 |
| `rpc-stable` | PostgREST | 1.00 | 0.95 | 0.12 | 0 |
| `rpc-stable` | supalite/Node | 0.99 | 0.70 | 0.09 | 0 |
| `rpc-stable` | supalite/Bun | 0.98 | 0.78 | 0.09 | 0 |
| `insert-minimal` | PostgREST | 0.99 | 0.96 | 0.13 | 0 |
| `insert-minimal` | supalite/Node | 0.99 | 0.65 | 0.09 | 0 |
| `insert-minimal` | supalite/Bun | 0.99 | 0.68 | 0.09 | 0 |
| `insert-representation` | PostgREST | 1.00 | 1.07 | 0.15 | 0 |
| `insert-representation` | supalite/Node | 0.98 | 0.70 | 0.12 | 0 |
| `insert-representation` | supalite/Bun | 0.98 | 0.71 | 0.08 | 0 |
| `update-by-pk` | PostgREST | 1.00 | 1.02 | 0.13 | 0 |
| `update-by-pk` | supalite/Node | 0.98 | 0.66 | 0.09 | 0 |
| `update-by-pk` | supalite/Bun | 0.99 | 0.71 | 0.09 | 0 |

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

| Scenario | Bare PostgREST | Through Kong | Cost | p50 bare -> via Kong |
|---|---|---|---|---|
| `tiny-select` | 3,098 req/s | 1,544 req/s | **2.01x slower** | 10.1 -> 20.0 ms |
| `page-25` | 2,151 req/s | 1,292 req/s | **1.66x slower** | 14.6 -> 23.9 ms |
| `insert-minimal` | 3,056 req/s | 1,525 req/s | **2.00x slower** | 10.2 -> 20.3 ms |

### 3. Docker itself is nearly free - 0-12%

The same PostgREST binary, same config, same core, run three ways:

| Scenario | Mode | req/s | % of native | p50 ms | API CPU us/req |
|---|---|---|---|---|---|
| `tiny-select` | native process | 3,132 | 100% | 10.01 | 320 |
| `tiny-select` | container, `--network host` | 3,071 | 98% | 10.25 | 326 |
| `tiny-select` | container, bridge + published port + NAT'd DB | 3,089 | 99% | 10.08 | 323 |
| `page-25` | native process | 2,317 | 100% | 13.66 | 432 |
| `page-25` | container, `--network host` | 2,317 | 100% | 13.45 | 427 |
| `page-25` | container, bridge + published port + NAT'd DB | 2,034 | 88% | 15.48 | 492 |
| `insert-minimal` | native process | 2,964 | 100% | 10.65 | 337 |
| `insert-minimal` | container, `--network host` | 2,811 | 95% | 11.17 | 356 |
| `insert-minimal` | container, bridge + published port + NAT'd DB | 2,847 | 96% | 10.98 | 348 |

So containerisation is **not** the explanation. `--network host` is within 5% of
native; the bridge + published-port + NAT'd-DB path costs up to 12% on the larger
payload. Nothing close to a multiple.

### 4. In-process vs HTTP is worth ~20%, not multiples

The published supalite Postgres row is **in-process** - no socket at all. Same
`App`, same query, same core, same 32-way concurrency, Bun:

| Path | req/s | API CPU us/req | p50 ms |
|---|---|---|---|
| in-process (`app.getClient()`, no socket) | 649 | 1,524 | 44.3 |
| over HTTP (`lite start`, Bun) | 561 | 1,725 | 54.3 |

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

| Scenario | Variant | 1 API core | 2 API cores | change | API cores busy 1c -> 2c | PG core busy (of 1) 1c -> 2c |
|---|---|---|---|---|---|---|
| `tiny-select` | PostgREST | 3,174 | 2,834 | -10.7% | 0.98 -> 1.45 | 0.82 -> 0.73 |
| `tiny-select` | supalite/Node | 729 | 870 | +19.3% | 0.98 -> 1.18 | 0.42 -> 0.50 |
| `tiny-select` | supalite/Bun | 782 | 821 | +5.0% | 0.97 -> 1.16 | 0.43 -> 0.49 |
| `page-25` | PostgREST | 2,266 | 2,264 | -0.1% | 0.99 -> 1.47 | 0.74 -> 0.75 |
| `page-25` | supalite/Node | 701 | 809 | +15.5% | 0.97 -> 1.19 | 0.45 -> 0.52 |
| `page-25` | supalite/Bun | 661 | 688 | +4.1% | 0.98 -> 1.12 | 0.44 -> 0.47 |
| `insert-minimal` | PostgREST | 3,365 | 3,045 | -9.5% | 0.99 -> 1.48 | 0.78 -> 0.72 |
| `insert-minimal` | supalite/Node | 664 | 727 | +9.5% | 0.96 -> 1.18 | 0.40 -> 0.48 |
| `insert-minimal` | supalite/Bun | 816 | 833 | +2.1% | 0.96 -> 1.11 | 0.49 -> 0.50 |

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
number: PostgREST 331 us against supalite's 1,408 us for the
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

| Scenario | Variant | order PostgREST->Node->Bun | order Bun->Node->PostgREST | shift |
|---|---|---|---|---|
| `tiny-select` | PostgREST | 2,968 | 3,123 | +5.2% |
| `tiny-select` | supalite/Node | 693 | 772 | +11.4% |
| `tiny-select` | supalite/Bun | 561 | 711 | +26.8% |
| `page-25` | PostgREST | 2,253 | 2,342 | +3.9% |
| `page-25` | supalite/Node | 639 | 661 | +3.4% |
| `page-25` | supalite/Bun | 661 | 635 | -3.8% |
| `insert-minimal` | PostgREST | 2,880 | 3,138 | +9.0% |
| `insert-minimal` | supalite/Node | 618 | 692 | +12.0% |
| `insert-minimal` | supalite/Bun | 661 | 764 | +15.5% |

| Scenario | PostgREST / supalite/Node, forward order | reversed order |
|---|---|---|
| `tiny-select` | 4.28x | 4.05x |
| `page-25` | 3.53x | 3.55x |
| `insert-minimal` | 4.66x | 4.53x |

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
   reads, 14 → 2 on RPC.
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
