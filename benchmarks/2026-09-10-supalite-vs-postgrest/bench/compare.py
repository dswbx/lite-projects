#!/usr/bin/env python3
"""Diff two benchmark runs — the "did our optimisation work?" tool.

    python3 bench/compare.py results/main-1core-c32.json results/after.json

Compares per scenario and per variant, and flags whether a change is likely
real. On a shared vCPU box the measured run-to-run spread for the same
scenario is 9-16% (median across variants; worst case 43%), so anything under
+/-15% is reported as noise rather than a win. Use pg_calls_per_req for anything
finer than that -- see below.

It also diffs `pg_calls_per_req`, which is the deterministic one: statement
count per request does not vary with machine load, so it is the honest
regression test for a query-shape optimisation.
"""
import json, sys

# Measured run-to-run spread on this harness/box is 9-16% median (worst 43%) for
# the same scenario across repeats, so anything smaller than this is not a result.
NOISE = 0.15


def load(path):
    d = json.load(open(path))
    return {(s["scenario"], s["variant"]): s for s in d["summary"]}, d


def arrow(delta):
    if abs(delta) < NOISE:
        return "≈ noise"
    return ("faster" if delta > 0 else "SLOWER") + f" {abs(delta) * 100:.1f}%"


def main():
    if len(sys.argv) != 3:
        print(__doc__)
        return 2
    before, bmeta = load(sys.argv[1])
    after, ameta = load(sys.argv[2])
    keys = [k for k in after if k in before]
    if not keys:
        print("no overlapping scenario/variant pairs")
        return 1

    for field, label in (("connections", "connections"),):
        b, a = bmeta["config"].get(field), ameta["config"].get(field)
        if b != a:
            print(f"!! {label} differ ({b} vs {a}) — not comparable\n")

    print(f"{'scenario':24} {'variant':15} {'req/s before':>13} {'after':>10} "
          f"{'change':>16}  {'stmts/req':>11}  {'API µs/req':>12}")
    print("-" * 112)
    wins = regressions = 0
    for scen, var in sorted(keys):
        b, a = before[(scen, var)], after[(scen, var)]
        d = (a["rps"] - b["rps"]) / b["rps"]
        if d >= NOISE:
            wins += 1
        elif d <= -NOISE:
            regressions += 1
        stmts = f"{b['pg_calls_per_req']:.2f}→{a['pg_calls_per_req']:.2f}"
        cpu = f"{b['api_cpu_us_per_req']:,.0f}→{a['api_cpu_us_per_req']:,.0f}"
        print(f"{scen:24} {var:15} {b['rps']:13,.0f} {a['rps']:10,.0f} "
              f"{arrow(d):>16}  {stmts:>11}  {cpu:>12}")

    print("-" * 112)
    print(f"{wins} improved beyond noise, {regressions} regressed, "
          f"{len(keys) - wins - regressions} unchanged (threshold ±{NOISE * 100:.0f}%)")

    # statement count is machine-independent, so treat it as a hard assertion
    changed = [(s, v, before[(s, v)]["pg_calls_per_req"], after[(s, v)]["pg_calls_per_req"])
               for s, v in sorted(keys)
               if abs(after[(s, v)]["pg_calls_per_req"] - before[(s, v)]["pg_calls_per_req"]) >= 0.05]
    if changed:
        print("\nPostgres statements per request changed (machine-independent):")
        for s, v, b, a in changed:
            print(f"  {s:24} {v:15} {b:6.2f} → {a:6.2f}")
    else:
        print("\nPostgres statements per request unchanged in every scenario.")
    return 0


sys.exit(main())
