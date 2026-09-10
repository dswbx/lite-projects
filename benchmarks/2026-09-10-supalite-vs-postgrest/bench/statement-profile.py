#!/usr/bin/env python3
"""Record the exact Postgres statements each server issues for ONE request.

This is where most of the architectural difference lives, so it is captured as
evidence rather than inferred from aggregate timings.
"""
import json, os, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "bench"))

APIKEY = next(l.strip().split("=", 1)[1] for l in open(os.path.join(ROOT, ".env"))
              if l.startswith("SUPABASE_PUBLISHABLE_KEY="))
TARGETS = {
    "postgrest":     ("http://127.0.0.1:3002", []),
    "supalite-node": ("http://127.0.0.1:3001/rest/v1", ["-H", f"apikey: {APIKEY}"]),
    "supalite-bun":  ("http://127.0.0.1:3003/rest/v1", ["-H", f"apikey: {APIKEY}"]),
}


def psql(sql):
    return subprocess.run(["sudo", "-u", "postgres", "psql", "-d", "bench", "-tAc", sql],
                          capture_output=True, text=True).stdout.strip()


def profile(name, path, extra):
    base, hdrs = TARGETS[name]
    psql("select monitor.pg_stat_statements_reset()")
    subprocess.run(["curl", "-sS", "-o", "/dev/null", *hdrs, *extra, base + path], check=True)
    # queries contain newlines, so let Postgres do the encoding
    rows = psql("select coalesce(json_agg(t order by t.calls desc, t.query)::text, '[]') from ("
                "select calls, round(total_exec_time::numeric, 3) as exec_ms, "
                "regexp_replace(left(query, 260), '\\s+', ' ', 'g') as query "
                "from monitor.pg_stat_statements "
                "where query not like '%pg_stat_statements%') t")
    stmts = [{"calls": r["calls"], "exec_ms": float(r["exec_ms"]), "query": r["query"]}
             for r in json.loads(rows)]
    return {"server": name, "path": path,
            "total_statements": sum(s["calls"] for s in stmts),
            "total_exec_ms": round(sum(s["exec_ms"] for s in stmts), 3),
            "statements": stmts}


out = []
for path in ["/posts?select=id&limit=1"]:
    for name in TARGETS:
        p = profile(name, path, [])
        out.append(p)
        print(f"\n=== {name}  {path}  -> {p['total_statements']} statements, "
              f"{p['total_exec_ms']} ms exec")
        for s in p["statements"]:
            print(f"   {s['calls']}x  {s['exec_ms']:8.3f}ms  {s['query']}")

with open(os.path.join(ROOT, "results", "statement-profile.json"), "w") as f:
    json.dump(out, f, indent=2)
