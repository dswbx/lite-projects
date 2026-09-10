/**
 * In-process vs HTTP, same App instance, same query.
 *
 * The published supalite benchmark's closest pair was "postgres · in-process ·
 * bun" against "supabase · http · docker". This isolates the first half of that
 * difference: how much throughput the *missing network boundary* is worth, with
 * everything else (App, driver, Postgres, core budget) held constant.
 *
 * Run: taskset -c 0 bun bench/inprocess.ts
 */
import { App } from "@supabase/lite";
import { createPostgresConnection } from "@supabase/lite/postgres";

const DB_URL = process.env.SUPALITE_DB_URL!;
const APIKEY = process.env.SUPABASE_PUBLISHABLE_KEY!;
const CONCURRENCY = Number(process.env.BENCH_CONNECTIONS ?? 32);
const WARMUP_MS = Number(process.env.BENCH_WARMUP_MS ?? 4000);
const DURATION_MS = Number(process.env.BENCH_DURATION_MS ?? 12000);

const connection = createPostgresConnection({ url: DB_URL });
const app = new App({
   connection,
   // mirrors supabase/config.toml: data API only, same key enforcement as `lite start`
   auth: {
      enabled: false,
      publishable_key: APIKEY,
      secret_key: process.env.SUPABASE_SECRET_KEY,
   },
   storage: { enabled: false },
   options: { server: { admin: false } },
});
const client = app.getClient();

function cpuSeconds(): number {
   const u = process.cpuUsage();
   return (u.user + u.system) / 1e6;
}

async function phase(label: string, ms: number) {
   const lat: number[] = [];
   let done = 0;
   const stopAt = performance.now() + ms;
   const cpu0 = cpuSeconds();
   const t0 = performance.now();

   await Promise.all(
      Array.from({ length: CONCURRENCY }, async () => {
         while (performance.now() < stopAt) {
            const s = performance.now();
            const { error } = await client.from("posts").select("id").limit(1);
            if (error) throw new Error(`${label}: ${error.message}`);
            lat.push(performance.now() - s);
            done++;
         }
      }),
   );

   const wall = (performance.now() - t0) / 1000;
   const cpu = cpuSeconds() - cpu0;
   lat.sort((a, b) => a - b);
   const p = (q: number) => lat[Math.min(lat.length - 1, Math.floor((q / 100) * lat.length))];
   return {
      label,
      requests: done,
      wall_s: +wall.toFixed(3),
      rps: +(done / wall).toFixed(1),
      cpu_s: +cpu.toFixed(3),
      cpu_us_per_req: +((cpu * 1e6) / done).toFixed(1),
      p50_ms: +p(50).toFixed(3),
      p90_ms: +p(90).toFixed(3),
      p99_ms: +p(99).toFixed(3),
      concurrency: CONCURRENCY,
   };
}

// App does lazy first-request bootstrapping (role/metadata reconciliation);
// firing 32 concurrent first requests at it races and fails with
// "tuple concurrently updated", so prime it with a single sequential request.
{
   const { error } = await client.from("posts").select("id").limit(1);
   if (error) throw new Error(`prime: ${error.message}`);
}

await phase("warmup", WARMUP_MS);
const result = await phase("in-process", DURATION_MS);
console.log(JSON.stringify(result));
await Bun.write("results/inprocess-bun.json", JSON.stringify(result, null, 2));
await app.connection.close?.();
process.exit(0);
