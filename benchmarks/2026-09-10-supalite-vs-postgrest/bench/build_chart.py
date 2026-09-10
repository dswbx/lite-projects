#!/usr/bin/env python3
"""Render results/chart.html: a self-contained grouped-bar chart of the matrix."""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAIN = json.load(open(os.path.join(ROOT, "results", "main-1core-c32.json")))
ENV = json.load(open(os.path.join(ROOT, "results", "environment.json")))
SCEN = json.load(open(os.path.join(ROOT, "bench", "scenarios.json")))

SERIES = [
    ("postgrest", "PostgREST 16.2", 1),
    ("supalite-node", "supalite 0.10.0 / Node 22", 2),
    ("supalite-bun", "supalite 0.10.0 / Bun 1.3", 3),
]

idx = {}
for s in MAIN["summary"]:
    idx.setdefault(s["scenario"], {})[s["variant"]] = s

rows = []
for sc in SCEN:
    sid = sc["id"]
    if sid not in idx:
        continue
    rows.append({
        "id": sid,
        "group": sc["group"],
        "desc": sc["desc"],
        "vals": {v: idx[sid][v]["rps"] for v, _, _ in SERIES},
        "p50": {v: idx[sid][v]["p50_us"] / 1000 for v, _, _ in SERIES},
        "p99": {v: idx[sid][v]["p99_us"] / 1000 for v, _, _ in SERIES},
        "cpu": {v: idx[sid][v]["api_cpu_us_per_req"] for v, _, _ in SERIES},
        "stmts": {v: idx[sid][v]["pg_calls_per_req"] for v, _, _ in SERIES},
        "api_sat": {v: idx[sid][v]["api_core_saturation"] for v, _, _ in SERIES},
        "pg_busy": {v: idx[sid][v]["pg_cores_busy"] for v, _, _ in SERIES},
    })

payload = {
    "rows": rows,
    "series": [{"key": k, "label": l, "slot": s} for k, l, s in SERIES],
}

cpu = ENV["cpu"]
subtitle = (f"One shared PostgreSQL {ENV['versions']['postgres'].split()[1]} · "
            f"same schema, same {int(ENV['dataset']['posts']):,}-row dataset, same request bytes · "
            f"API server pinned to 1 core, Postgres to 2, load generator to 1 · "
            f"32 connections, median of 3 interleaved repeats")
specs = (f"{cpu['model']}, {cpu['vcpus']} vCPU ({cpu['hypervisor']} guest) · "
         f"{int(ENV['memory']['MemTotal'].split()[0]) // 1024} MiB RAM · "
         f"{ENV['host']['os']}, kernel {ENV['host']['kernel']}")

html = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>supalite vs bare PostgREST — Data API throughput</title>
<style>
  .viz-root {
    color-scheme: light;
    --surface-1: #fcfcfb;
    --page: #f9f9f7;
    --text-primary: #0b0b0b;
    --text-secondary: #52514e;
    --muted: #898781;
    --grid: #e1e0d9;
    --baseline: #c3c2b7;
    --border: rgba(11,11,11,0.10);
    --series-1: #2a78d6;
    --series-2: #eb6834;
    --series-3: #1baf7a;
  }
  @media (prefers-color-scheme: dark) {
    :root:where(:not([data-theme="light"])) .viz-root {
      color-scheme: dark;
      --surface-1: #1a1a19; --page: #0d0d0d;
      --text-primary: #ffffff; --text-secondary: #c3c2b7; --muted: #898781;
      --grid: #2c2c2a; --baseline: #383835; --border: rgba(255,255,255,0.10);
      --series-1: #3987e5; --series-2: #d95926; --series-3: #199e70;
    }
  }
  :root[data-theme="dark"] .viz-root {
    color-scheme: dark;
    --surface-1: #1a1a19; --page: #0d0d0d;
    --text-primary: #ffffff; --text-secondary: #c3c2b7; --muted: #898781;
    --grid: #2c2c2a; --baseline: #383835; --border: rgba(255,255,255,0.10);
    --series-1: #3987e5; --series-2: #d95926; --series-3: #199e70;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: var(--page); color: var(--text-primary);
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  }
  .viz-root { max-width: 1060px; margin: 0 auto; padding: 32px 20px 64px; }
  h1 { font-size: 24px; font-weight: 650; margin: 0 0 8px; letter-spacing: -0.01em; }
  .sub { color: var(--text-secondary); font-size: 13.5px; line-height: 1.55; margin: 0 0 4px; max-width: 78ch; }
  .specs { color: var(--muted); font-size: 12.5px; margin: 8px 0 0; }
  .card {
    background: var(--surface-1); border: 1px solid var(--border);
    border-radius: 10px; padding: 20px 22px; margin-top: 22px;
  }
  .tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-top: 22px; }
  .tile { background: var(--surface-1); border: 1px solid var(--border); border-radius: 10px; padding: 14px 16px; }
  .tile .k { font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); }
  .tile .v { font-size: 27px; font-weight: 650; margin-top: 6px; letter-spacing: -0.02em; }
  .tile .n { font-size: 12px; color: var(--text-secondary); margin-top: 4px; line-height: 1.4; }
  .toolbar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-top: 22px; }
  .legend { display: flex; flex-wrap: wrap; gap: 16px; align-items: center; font-size: 13px; color: var(--text-secondary); }
  .legend span.sw { width: 11px; height: 11px; border-radius: 3px; display: inline-block; margin-right: 6px; vertical-align: -1px; }
  button {
    font: inherit; font-size: 12.5px; padding: 5px 11px; border-radius: 7px;
    border: 1px solid var(--border); background: transparent; color: var(--text-secondary); cursor: pointer;
  }
  button[aria-pressed="true"] { color: var(--text-primary); border-color: var(--baseline); }
  button:focus-visible { outline: 2px solid var(--series-1); outline-offset: 1px; }
  .grow { flex: 1; }
  .chart { margin-top: 6px; }
  .rowlabel { font-size: 12.5px; fill: var(--text-secondary); }
  .rowlabel.grp { fill: var(--muted); font-size: 11px; letter-spacing: 0.05em; }
  .tick { font-size: 11.5px; fill: var(--muted); font-variant-numeric: tabular-nums; }
  .val { font-size: 11px; fill: var(--text-secondary); font-variant-numeric: tabular-nums; }
  .gl { stroke: var(--grid); stroke-width: 1; }
  .bl { stroke: var(--baseline); stroke-width: 1; }
  .bar { cursor: pointer; }
  .bar rect { transition: opacity .12s; }
  .bar:hover rect { opacity: .82; }
  table { border-collapse: collapse; width: 100%; font-size: 12.5px; margin-top: 4px; }
  th, td { text-align: right; padding: 6px 8px; border-bottom: 1px solid var(--grid); font-variant-numeric: tabular-nums; }
  th:first-child, td:first-child { text-align: left; font-variant-numeric: normal; }
  th { color: var(--muted); font-weight: 550; font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.04em; }
  .tt {
    position: fixed; pointer-events: none; opacity: 0; transition: opacity .1s;
    background: var(--surface-1); border: 1px solid var(--border); border-radius: 8px;
    padding: 9px 11px; font-size: 12px; line-height: 1.5; box-shadow: 0 6px 22px rgba(0,0,0,.14);
    max-width: 320px; z-index: 10;
  }
  .tt b { font-weight: 620; }
  .tt .r { display: flex; justify-content: space-between; gap: 18px; color: var(--text-secondary); }
  .tt .r b { color: var(--text-primary); }
  .hide { display: none; }
  footer { color: var(--muted); font-size: 12px; margin-top: 26px; line-height: 1.6; }
  a { color: inherit; }
</style>
</head>
<body>
<div class="viz-root">
  <h1>supalite on Postgres vs bare PostgREST on Postgres</h1>
  <p class="sub">__SUBTITLE__</p>
  <p class="specs">__SPECS__</p>

  <div class="tiles" id="tiles"></div>

  <div class="toolbar">
    <div class="legend" id="legend"></div>
    <span class="grow"></span>
    <button id="btn-metric" aria-pressed="false">Show p50 latency</button>
    <button id="btn-table" aria-pressed="false">Table view</button>
    <button id="btn-theme" aria-pressed="false">Dark</button>
  </div>

  <div class="card">
    <div class="chart" id="chart"></div>
    <div id="tablewrap" class="hide"></div>
  </div>

  <footer>
    Bars are the median of 3 interleaved repeats; zero errors across the matrix.
    <code>count-exact</code> is the Postgres-bound control — both sides land within
    5% of each other there, which is what makes the rest of the chart attributable
    to the API layer. Hover any bar for latency, per-request API CPU and the
    Postgres statement count.
  </footer>
</div>
<div class="tt" id="tt"></div>
<script id="data" type="application/json">__DATA__</script>
<script>
const DATA = JSON.parse(document.getElementById('data').textContent);
const COLOR = s => `var(--series-${s})`;
const fmt = n => n >= 1000 ? n.toLocaleString(undefined,{maximumFractionDigits:0})
                           : n.toLocaleString(undefined,{maximumFractionDigits:0});
let metric = 'rps';

// ---- stat tiles ------------------------------------------------------------
const get = (id, v, m) => {
  const r = DATA.rows.find(x => x.id === id);
  return m === 'rps' ? r.vals[v] : r[m][v];
};
const readRows = DATA.rows.filter(r => r.group === 'read' && r.id !== 'count-exact');
const ratios = readRows.map(r => r.vals['postgrest'] / r.vals['supalite-node']);
document.getElementById('tiles').innerHTML = [
  ['PostgREST advantage', `${Math.min(...ratios).toFixed(1)}–${Math.max(...ratios).toFixed(1)}×`,
   'requests/s on reads, 1 core each'],
  ['Postgres-bound control', `${(get('count-exact','postgrest','rps')/get('count-exact','supalite-node','rps')).toFixed(2)}×`,
   '<code>count-exact</code> — a tie, as expected'],
  ['API CPU per request', `${fmt(get('tiny-select','postgrest','cpu'))} / ${fmt(get('tiny-select','supalite-node','cpu'))} µs`,
   'cheapest read — PostgREST / supalite'],
  ['Postgres statements', `2 / 9`, 'per HTTP request, same single-row read'],
].map(([k,v,n]) => `<div class="tile"><div class="k">${k}</div><div class="v">${v}</div><div class="n">${n}</div></div>`).join('');

// ---- legend ----------------------------------------------------------------
document.getElementById('legend').innerHTML = DATA.series.map(s =>
  `<span><span class="sw" style="background:${COLOR(s.slot)}"></span>${s.label}</span>`).join('');

// ---- chart -----------------------------------------------------------------
const tt = document.getElementById('tt');
function showTip(e, row, s) {
  tt.innerHTML = `<b>${row.id}</b> · ${DATA.series.find(x=>x.key===s).label}
    <div style="color:var(--muted);margin:5px 0 7px;font-size:11.5px">${row.desc}</div>
    <div class="r"><span>Throughput</span><b>${fmt(row.vals[s])} req/s</b></div>
    <div class="r"><span>Latency p50 / p99</span><b>${row.p50[s].toFixed(1)} / ${row.p99[s].toFixed(1)} ms</b></div>
    <div class="r"><span>API CPU per request</span><b>${fmt(row.cpu[s])} µs</b></div>
    <div class="r"><span>Postgres statements/req</span><b>${row.stmts[s].toFixed(2)}</b></div>
    <div class="r"><span>API core busy</span><b>${row.api_sat[s].toFixed(2)}</b></div>
    <div class="r"><span>PG cores busy (of 2)</span><b>${row.pg_busy[s].toFixed(2)}</b></div>`;
  tt.style.opacity = 1;
  const pad = 14, w = 320;
  tt.style.left = Math.min(e.clientX + pad, window.innerWidth - w - pad) + 'px';
  tt.style.top = Math.min(e.clientY + pad, window.innerHeight - tt.offsetHeight - pad) + 'px';
}
const hideTip = () => tt.style.opacity = 0;

function render() {
  const rows = DATA.rows;
  const L = 168, R = 58, T = 30, B = 34;
  const barH = 13, gap = 2, groupPad = 16, sectionPad = 20;
  const groupH = DATA.series.length * barH + (DATA.series.length - 1) * gap;
  // extra room wherever the read/write section label is printed
  const sections = new Set(rows.map(r => r.group)).size;
  const H = T + B + rows.length * (groupH + groupPad) + sections * sectionPad;
  const W = 1000;
  const plotW = W - L - R;
  const key = metric === 'rps' ? 'vals' : 'p50';
  const max = Math.max(...rows.flatMap(r => DATA.series.map(s => r[key][s.key])));
  const nice = Math.pow(10, Math.floor(Math.log10(max)));
  const step = max / nice > 5 ? 2 * nice : max / nice > 2 ? nice : nice / 2;
  const top = Math.ceil(max / step) * step;
  const x = v => (v / top) * plotW;

  let g = '';
  for (let t = 0; t <= top + 1e-9; t += step) {
    g += `<line class="gl" x1="${L + x(t)}" y1="${T - 8}" x2="${L + x(t)}" y2="${H - B}"/>
          <text class="tick" x="${L + x(t)}" y="${T - 14}" text-anchor="middle">${fmt(t)}</text>`;
  }
  g += `<line class="bl" x1="${L}" y1="${T - 8}" x2="${L}" y2="${H - B}"/>`;
  g += `<text class="tick" x="${L + plotW / 2}" y="${H - 8}" text-anchor="middle">${
        metric === 'rps' ? 'requests / second (higher is better)' : 'p50 latency, ms (lower is better)'}</text>`;

  let lastGroup = null, yCursor = T;
  rows.forEach((r, i) => {
    if (r.group !== lastGroup) yCursor += sectionPad;
    const y0 = yCursor;
    if (r.group !== lastGroup) {
      lastGroup = r.group;
      g += `<text class="rowlabel grp" x="0" y="${y0 - 8}">${r.group.toUpperCase()}</text>`;
    }
    yCursor += groupH + groupPad;
    g += `<text class="rowlabel" x="${L - 12}" y="${y0 + groupH / 2 + 4}" text-anchor="end">${r.id}</text>`;
    DATA.series.forEach((s, j) => {
      const v = r[key][s.key];
      const y = y0 + j * (barH + gap);
      const w = Math.max(x(v), 2);
      // 4px rounded data-end, square against the baseline
      g += `<g class="bar" data-row="${i}" data-series="${s.key}">
              <rect x="${L}" y="${y}" width="${w}" height="${barH}" rx="3" fill="${COLOR(s.slot)}"/>
              <rect x="${L}" y="${y}" width="${Math.min(4, w)}" height="${barH}" fill="${COLOR(s.slot)}"/>
              <rect x="${L}" y="${y - 3}" width="${plotW}" height="${barH + 6}" fill="transparent"/>
              <text class="val" x="${L + w + 7}" y="${y + barH - 2.5}">${
                metric === 'rps' ? fmt(v) : v.toFixed(1)}</text>
            </g>`;
    });
  });
  const svg = `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" role="img"
      aria-label="Grouped bar chart of ${metric === 'rps' ? 'throughput' : 'p50 latency'} per scenario">${g}</svg>`;
  document.getElementById('chart').innerHTML = svg;
  document.querySelectorAll('.bar').forEach(el => {
    const r = DATA.rows[+el.dataset.row], s = el.dataset.series;
    el.addEventListener('mousemove', e => showTip(e, r, s));
    el.addEventListener('mouseleave', hideTip);
  });
}

function renderTable() {
  const head = ['Scenario', ...DATA.series.flatMap(s => [`${s.label} req/s`, `p50 ms`, `p99 ms`, `API µs/req`, `PG stmts/req`])];
  const body = DATA.rows.map(r => `<tr><td>${r.id}</td>` + DATA.series.map(s =>
      `<td>${fmt(r.vals[s.key])}</td><td>${r.p50[s.key].toFixed(1)}</td><td>${r.p99[s.key].toFixed(1)}</td>`
      + `<td>${fmt(r.cpu[s.key])}</td><td>${r.stmts[s.key].toFixed(2)}</td>`).join('') + '</tr>').join('');
  document.getElementById('tablewrap').innerHTML =
    `<table><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table>`;
}

document.getElementById('btn-metric').onclick = e => {
  metric = metric === 'rps' ? 'p50' : 'rps';
  e.target.textContent = metric === 'rps' ? 'Show p50 latency' : 'Show throughput';
  e.target.setAttribute('aria-pressed', metric !== 'rps');
  render();
};
document.getElementById('btn-table').onclick = e => {
  const on = document.getElementById('tablewrap').classList.toggle('hide') === false;
  document.getElementById('chart').classList.toggle('hide', on);
  e.target.setAttribute('aria-pressed', on);
};
document.getElementById('btn-theme').onclick = e => {
  const dark = document.documentElement.getAttribute('data-theme') !== 'dark';
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  e.target.textContent = dark ? 'Light' : 'Dark';
  e.target.setAttribute('aria-pressed', dark);
};

render();
renderTable();
</script>
</body>
</html>
"""

html = (html.replace("__SUBTITLE__", subtitle)
            .replace("__SPECS__", specs)
            .replace("__DATA__", json.dumps(payload)))
out = os.path.join(ROOT, "results", "chart.html")
open(out, "w").write(html)
print(f"wrote {out} ({len(html)} bytes)")
