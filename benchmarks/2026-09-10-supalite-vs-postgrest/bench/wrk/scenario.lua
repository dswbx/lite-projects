-- Generic wrk script driven by env vars, so both servers see byte-identical
-- request shapes apart from base path and the auth header.
--   BENCH_METHOD    HTTP verb
--   BENCH_PATH      path (may contain %RAND% -> random int in [1, BENCH_RAND_MAX])
--   BENCH_BODY      request body
--   BENCH_HEADERS   "Name: value" entries separated by newlines
--   BENCH_RAND_MAX  upper bound for %RAND%
--   BENCH_OUT       file to write the JSON summary to
local method   = os.getenv("BENCH_METHOD") or "GET"
local path     = os.getenv("BENCH_PATH")
local body     = os.getenv("BENCH_BODY")
local hdrs     = os.getenv("BENCH_HEADERS") or ""
local rand_max = tonumber(os.getenv("BENCH_RAND_MAX") or "0")
local out      = os.getenv("BENCH_OUT")

for line in hdrs:gmatch("[^\n]+") do
   local k, v = line:match("^%s*([^:]+):%s*(.*)$")
   if k then wrk.headers[k] = v end
end
wrk.method = method
if body and #body > 0 then wrk.body = body end

local dynamic = rand_max > 0 and path:find("%%RAND%%") ~= nil

function setup(thread)
   thread:set("rngseed", 20260910)
end

function init(args)
   math.randomseed(rngseed)
end

function request()
   if dynamic then
      return wrk.format(nil, (path:gsub("%%RAND%%", tostring(math.random(1, rand_max)))))
   end
   return wrk.format(nil, path)
end

function done(summary, latency, requests)
   local rps = summary.requests / (summary.duration / 1e6)
   local json = string.format('{"requests":%d,"duration_us":%d,"bytes":%d,'
      .. '"errors_connect":%d,"errors_read":%d,"errors_write":%d,'
      .. '"errors_status":%d,"errors_timeout":%d,"rps":%.2f,'
      .. '"lat_mean_us":%.1f,"lat_stdev_us":%.1f,"lat_max_us":%d,'
      .. '"p50_us":%d,"p75_us":%d,"p90_us":%d,"p95_us":%d,"p99_us":%d,"p999_us":%d}',
      summary.requests, summary.duration, summary.bytes,
      summary.errors.connect, summary.errors.read, summary.errors.write,
      summary.errors.status, summary.errors.timeout, rps,
      latency.mean, latency.stdev, latency.max,
      latency:percentile(50), latency:percentile(75), latency:percentile(90),
      latency:percentile(95), latency:percentile(99), latency:percentile(99.9))
   if out then
      local f = io.open(out, "w"); f:write(json); f:close()
   end
   io.write("\nBENCHJSON " .. json .. "\n")
end
