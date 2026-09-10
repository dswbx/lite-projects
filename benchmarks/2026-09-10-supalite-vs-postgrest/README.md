# supalite (Postgres driver) vs bare PostgREST — HTTP benchmark

Linear: [LITE-421](https://linear.app/supabase/issue/LITE-421/benchmark-supalite-with-postgres-against-bare-postgrest)

Both servers are pointed at **the same PostgreSQL instance, the same schema and
the same rows**, and both are driven over HTTP with the same request bytes. The
question this answers is narrow on purpose: *for a PostgREST-compatible Data API
in front of Postgres, how much does each implementation cost per request?*

## What is measured

| | |
|---|---|
| A | **PostgREST 16.2** — official static binary, run natively |
| B | **`@supabase/lite` 0.10.0** on **Node 22.22.2** — `lite start`, `driver = "postgres"` |
| C | **`@supabase/lite` 0.10.0** on **Bun 1.3.11** — same, `--config supabase/config-bun.toml` |

All three talk to one **PostgreSQL 16.13** server over TCP on loopback.

## Fairness rules

These are the choices that make the comparison defensible; each one is
enforced by the harness rather than assumed.

1. **One database.** One Postgres instance, one `bench` database, one schema
   applied once (through `lite migration up`, so supalite's own metadata is
   consistent and PostgREST introspects the identical physical schema),
   one deterministic seed (100k posts / 400k comments / 292k post_tags /
   50k notes, 150 MB — fully resident in a 2 GB `shared_buffers`).
2. **Same login role, same request role.** Every server connects as
   `authenticator` (`LOGIN NOINHERIT`) and every request executes as `anon`
   with **native Postgres RLS active**. `bench/parity.py` proves this via a
   `whoami()` RPC and by checking that an RLS-protected table returns the same
   25,000 of 50,000 rows on every server.
3. **Same connection pool.** 10 connections on both sides (PostgREST
   `db-pool = 10`; postgres.js defaults to `max: 10`, which supalite does not
   override).
4. **Same request bytes.** One scenario table (`bench/scenarios.json`) drives
   every server. The only differences are the base path (`/rest/v1` prefix on
   supalite) and the `apikey` header supalite requires.
5. **Verified equivalence before timing.** `bench/parity.py` compares status
   code and JSON body for all 16 scenarios and refuses to treat a scenario as
   comparable unless they match.
6. **Disjoint CPU budgets, checked not assumed.** `taskset` gives the API
   server, Postgres and the load generator their own cores. `--pg-cpus` only
   tells the harness which cores to *measure*; Postgres's own affinity is fixed
   when the cluster starts, so `bench/run.py` reads the postmaster's
   `Cpus_allowed_list` and aborts if it disagrees with `--pg-cpus` or overlaps
   the API or load-generator cores. Start the cluster accordingly:
   `taskset -c 1,2 pg_ctlcluster 16 main start`.
7. **Interleaved repeats.** Variants run A,B,C,A,B,C… per scenario and the
   median of 3 repeats is reported, so VM scheduling drift hits all variants
   equally instead of whichever ran last. Verified by re-running with the order
   inverted: absolute numbers move together, ratios move <5%.
8. **Bottleneck disclosure.** Per-core `/proc/stat` utilisation is recorded for
   every run, so any number that is Postgres-bound or load-generator-bound
   rather than API-bound is visible instead of hidden.
9. **Apples-to-apples feature flags.** supalite's `[auth]` and `[storage]` are
   off, because bare PostgREST ships neither. PostgREST's
   `db-aggregates-enabled` is on, to match supalite's default surface.

## Runtime specs

See `results/environment.json` for the machine-readable capture.

## Layout

```
bench/scenarios.json        the 16 request shapes
bench/parity.py             equivalence check (run before benchmarking)
bench/statement-profile.py  exact Postgres statements each server issues per request
bench/run.py                the driver (pinning, interleaving, CPU accounting)
bench/report.py             renders results JSON into markdown tables
bench/wrk/scenario.lua      env-driven wrk script (dynamic paths, percentile output)
bench/servers.sh            start/stop helpers
bench/killports.sh          free ports 3001-3003
sql/seed.sql                deterministic dataset
supabase/                   the supalite project (config + migrations)
postgrest/postgrest.conf    the PostgREST config
bench/chatter-control.py    pure-Postgres replay of each server's statement shape
bench/docker-overhead.py    native vs container (host-net and bridge) for the same binary
bench/kong-hop.py           what Supabase's Kong gateway costs in front of PostgREST
bench/inprocess.ts          supalite in-process (no socket) for the same query
bench/compare.py            noise-aware before/after diff of two result files
bench/build_results.py      renders RESULTS.md from the result JSON
bench/build_chart.py        renders results/chart.html
kong/kong.yml               Supabase's self-hosted rest-v1 gateway config
results/                    raw output, environment capture, chart
RESULTS.md                  the write-up
```

## Reproducing

Needs: Ubuntu 24.04, PostgreSQL 16, Node 22, Bun, `wrk`, and the PostgREST
binary. Docker Hub blobs were unreachable from this sandbox, so the binary was
extracted from the Google mirror of the official image:

```bash
docker pull mirror.gcr.io/postgrest/postgrest:latest
docker create --name p mirror.gcr.io/postgrest/postgrest:latest
docker export p -o p.tar && tar xf p.tar bin/postgrest && docker rm p
```

Then:

```bash
npm install                                    # @supabase/lite + postgres.js
npx lite generate-keys                         # writes SUPABASE_*_KEY into .env (gitignored)
cat >> .env <<'EOF'
SUPALITE_DB_URL=postgres://authenticator:benchpass@127.0.0.1:5432/bench
EOF
sudo -u postgres psql -f sql/roles.sql          # roles + bench database
SUPALITE_DB_URL=postgres://bench_app:benchpass@127.0.0.1:5432/bench \
  npx lite migration up                        # apply the schema
sudo -u postgres psql -d bench -f sql/post-migration-grants.sql
sudo -u postgres psql -d bench -f sql/seed.sql  # seed

npm run parity     # equivalence check — must pass before timing
npm run profile    # per-request Postgres statement profile
npm run bench      # the main matrix (~40 min on 4 vCPU)
npm run sweep      # concurrency sweep
npm run control    # pure-Postgres statement-shape control
npm run report     # regenerate RESULTS.md + results/chart.html
```

Supporting experiments (each writes its own file under `results/`):

```bash
python3 bench/docker-overhead.py    # native vs container, same PostgREST binary
python3 bench/kong-hop.py           # + Kong 2.8.1, Supabase self-hosted topology
taskset -c 0 bun bench/inprocess.ts # supalite with no HTTP boundary

# core-scaling pair — Postgres must be on ONE core for both, or the guard aborts
pg_ctlcluster 16 main stop && taskset -c 2 pg_ctlcluster 16 main start
python3 bench/run.py --out results/scaling-1core-pg1.json \
  --scenarios tiny-select,page-25,insert-minimal \
  --api-cpus 0 --pg-cpus 2 --loadgen-cpus 3 --duration 10 --warmup 3 --repeats 2
python3 bench/run.py --out results/scaling-2core-pg1.json \
  --scenarios tiny-select,page-25,insert-minimal \
  --api-cpus 0,1 --pg-cpus 2 --loadgen-cpus 3 --duration 10 --warmup 3 --repeats 2
# then put Postgres back on two cores for the main matrix
pg_ctlcluster 16 main stop && taskset -c 1,2 pg_ctlcluster 16 main start
```

## Re-running after an optimisation

```bash
npm install @supabase/lite@<new-version>
npm run parity                             # equivalence must still hold
npm run profile                            # did the statement count drop?
npm run bench -- --out results/after.json  # same flags as the baseline
python3 bench/compare.py results/main-1core-c32.json results/after.json
```

`compare.py` treats anything under ±15% as noise, because that is the measured
run-to-run spread on this harness, and diffs `pg_calls_per_req` separately — that
one comes from `pg_stat_statements` rather than from timing, so it is
machine-independent and is the right thing to gate a query-shape change on.
`npm run control` is a one-minute pre-check that replays just the two statement
shapes through pgbench.
