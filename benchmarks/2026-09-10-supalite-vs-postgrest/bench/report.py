#!/usr/bin/env python3
"""Render benchmark JSON into the markdown tables used in RESULTS.md."""
import json, sys, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORDER = ["postgrest", "supalite-node", "supalite-bun"]
SHORT = {"postgrest": "PostgREST", "supalite-node": "supalite/Node", "supalite-bun": "supalite/Bun"}


def load(path):
    return json.load(open(path))


def by_scenario(data):
    out = {}
    for s in data["summary"]:
        out.setdefault(s["scenario"], {})[s["variant"]] = s
    return out


def table(data, scenarios_meta):
    idx = by_scenario(data)
    variants = [v for v in ORDER if v in {s["variant"] for s in data["summary"]}]
    hdr = "| Scenario | " + " | ".join(f"{SHORT[v]} req/s" for v in variants) + " | ratio vs PostgREST |"
    sep = "|---|" + "---|" * (len(variants) + 1)
    rows = [hdr, sep]
    for sc in scenarios_meta:
        sid = sc["id"]
        if sid not in idx:
            continue
        cells = []
        for v in variants:
            r = idx[sid].get(v)
            cells.append(f"{r['rps']:,.0f}" if r else "–")
        base = idx[sid].get("postgrest")
        ratios = []
        for v in variants:
            if v == "postgrest":
                continue
            r = idx[sid].get(v)
            if r and base:
                ratios.append(f"{SHORT[v].split('/')[-1]} {base['rps'] / r['rps']:.2f}×")
        rows.append(f"| `{sid}` | " + " | ".join(cells) + " | " + ", ".join(ratios) + " |")
    return "\n".join(rows)


def latency_table(data, scenarios_meta):
    idx = by_scenario(data)
    variants = [v for v in ORDER if v in {s["variant"] for s in data["summary"]}]
    rows = ["| Scenario | " + " | ".join(f"{SHORT[v]} p50 / p99 (ms)" for v in variants) + " |",
            "|---|" + "---|" * len(variants)]
    for sc in scenarios_meta:
        sid = sc["id"]
        if sid not in idx:
            continue
        cells = []
        for v in variants:
            r = idx[sid].get(v)
            cells.append(f"{r['p50_us']/1000:.1f} / {r['p99_us']/1000:.1f}" if r else "–")
        rows.append(f"| `{sid}` | " + " | ".join(cells) + " |")
    return "\n".join(rows)


def cpu_table(data, scenarios_meta):
    idx = by_scenario(data)
    variants = [v for v in ORDER if v in {s["variant"] for s in data["summary"]}]
    rows = ["| Scenario | " + " | ".join(f"{SHORT[v]} API µs/req" for v in variants)
            + " | PG stmts/req (PostgREST → supalite) | PG exec ms/req (PostgREST → supalite) |",
            "|---|" + "---|" * (len(variants) + 2)]
    for sc in scenarios_meta:
        sid = sc["id"]
        if sid not in idx:
            continue
        cells = []
        for v in variants:
            r = idx[sid].get(v)
            cells.append(f"{r['api_cpu_us_per_req']:,.0f}" if r else "–")
        p = idx[sid].get("postgrest")
        s = idx[sid].get("supalite-node")
        st = f"{p['pg_calls_per_req']:.2f} → {s['pg_calls_per_req']:.2f}" if p and s else "–"
        ex = f"{p['pg_exec_ms_per_req']:.3f} → {s['pg_exec_ms_per_req']:.3f}" if p and s else "–"
        rows.append(f"| `{sid}` | " + " | ".join(cells) + f" | {st} | {ex} |")
    return "\n".join(rows)


def saturation_table(data, scenarios_meta):
    idx = by_scenario(data)
    variants = [v for v in ORDER if v in {s["variant"] for s in data["summary"]}]
    rows = ["| Scenario | Variant | API core busy | PG cores busy (of 2) | wrk core busy | errors |",
            "|---|---|---|---|---|---|"]
    for sc in scenarios_meta:
        sid = sc["id"]
        for v in variants:
            r = idx.get(sid, {}).get(v)
            if not r:
                continue
            rows.append(f"| `{sid}` | {SHORT[v]} | {r['api_core_saturation']:.2f} | "
                        f"{r['pg_cores_busy']:.2f} | {r['loadgen_core_saturation']:.2f} | {r['errors']} |")
    return "\n".join(rows)


if __name__ == "__main__":
    scenarios = json.load(open(os.path.join(ROOT, "bench", "scenarios.json")))
    data = load(sys.argv[1])
    print("## Throughput\n")
    print(table(data, scenarios))
    print("\n## Latency\n")
    print(latency_table(data, scenarios))
    print("\n## Cost per request\n")
    print(cpu_table(data, scenarios))
    print("\n## Bottleneck check\n")
    print(saturation_table(data, scenarios))
