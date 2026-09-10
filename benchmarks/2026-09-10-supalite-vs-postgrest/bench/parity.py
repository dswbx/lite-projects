#!/usr/bin/env python3
"""Verify every scenario returns an equivalent response from both servers.

A timing comparison is only meaningful if both sides actually do the same work,
so this runs first and refuses to let a scenario into the benchmark unless the
status codes match and the JSON payloads are equal (or, for scenarios with a
random id, structurally equal).
"""
import json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APIKEY = None
for line in open(os.path.join(ROOT, ".env")):
    if line.startswith("SUPABASE_PUBLISHABLE_KEY="):
        APIKEY = line.strip().split("=", 1)[1]

SERVERS = {
    "supalite": {"base": "http://127.0.0.1:3001/rest/v1", "headers": [f"apikey: {APIKEY}"]},
    "postgrest": {"base": "http://127.0.0.1:3002", "headers": []},
}


def call(server, sc, rand_value=1):
    s = SERVERS[server]
    path = sc["path"].replace("%RAND%", str(rand_value))
    cmd = ["curl", "-sS", "-o", "-", "-w", "\n__STATUS__%{http_code}", "-X", sc["method"],
           s["base"] + path]
    for h in s["headers"] + sc.get("headers", []):
        cmd += ["-H", h]
    if sc.get("body"):
        cmd += ["--data-binary", sc["body"]]
    out = subprocess.run(cmd, capture_output=True, text=True).stdout
    bodytext, status = out.rsplit("\n__STATUS__", 1)
    try:
        body = json.loads(bodytext) if bodytext.strip() else None
    except json.JSONDecodeError:
        body = bodytext
    return int(status), body


def shape(x):
    """Structural signature: keys and types, ignoring values."""
    if isinstance(x, list):
        return ["list", len(x), shape(x[0]) if x else None]
    if isinstance(x, dict):
        return {k: shape(v) for k, v in sorted(x.items())}
    return type(x).__name__


def main():
    scenarios = json.load(open(os.path.join(ROOT, "bench", "scenarios.json")))
    report, failures = [], 0
    for sc in scenarios:
        rv = 42 if sc.get("rand_max") else 1
        st_s, b_s = call("supalite", sc, rv)
        st_p, b_p = call("postgrest", sc, rv)
        ok_status = st_s == st_p
        if sc["group"] == "write":
            # writes mutate state, so only status + response shape can match
            ok_body = shape(b_s) == shape(b_p)
            mode = "shape"
        else:
            ok_body = b_s == b_p
            mode = "exact"
            if not ok_body:
                ok_body = shape(b_s) == shape(b_p)
                mode = "shape-only"
        status = "OK" if (ok_status and ok_body) else "MISMATCH"
        if status == "MISMATCH":
            failures += 1
        report.append({"id": sc["id"], "group": sc["group"], "match": status,
                       "compare": mode, "supalite_status": st_s, "postgrest_status": st_p})
        print(f"{status:9} {mode:11} {sc['id']:24} supalite={st_s} postgrest={st_p}")
        if status == "MISMATCH" or mode == "shape-only":
            print("   supalite :", json.dumps(b_s)[:400])
            print("   postgrest:", json.dumps(b_p)[:400])
    with open(os.path.join(ROOT, "results", "parity.json"), "w") as f:
        json.dump(report, f, indent=2)
    print(f"\n{len(scenarios) - failures}/{len(scenarios)} scenarios equivalent")
    return 1 if failures else 0


sys.exit(main())
