import { performance } from 'node:perf_hooks';
import { writeFile } from 'node:fs/promises';
const args = process.argv.slice(2),
  option = (name, fallback) => {
    const i = args.indexOf(name);
    return i < 0 ? fallback : args[i + 1];
  };
const origin = new URL(option('--url', 'http://127.0.0.1:3100/api'));
if (
  !['127.0.0.1', 'localhost'].includes(origin.hostname) ||
  !['http:', 'https:'].includes(origin.protocol) ||
  origin.username ||
  origin.password
)
  throw Error(
    'Load checks are restricted to local isolated/explicitly selected Pettly URLs.',
  );
const concurrency = Number(option('--concurrency', '5')),
  seconds = Number(option('--seconds', '10'));
if (
  !Number.isInteger(concurrency) ||
  concurrency < 1 ||
  concurrency > 20 ||
  !Number.isInteger(seconds) ||
  seconds < 1 ||
  seconds > 60
)
  throw Error('Bounded concurrency 1–20 and duration 1–60 seconds required.');
const durations = [],
  statuses = {},
  until = performance.now() + seconds * 1000;
let errors = 0;
const paths = [
  '/health/live',
  '/services',
  '/adoptions/publications',
  '/catalog/products',
];
await Promise.all(
  Array.from({ length: concurrency }, async (_, worker) => {
    let n = 0;
    while (performance.now() < until) {
      const start = performance.now();
      try {
        const response = await fetch(
          origin.href.replace(/\/$/, '') + paths[(worker + n++) % paths.length],
          { signal: AbortSignal.timeout(5000) },
        );
        await response.arrayBuffer();
        statuses[response.status] = (statuses[response.status] ?? 0) + 1;
        if (response.status >= 500) errors++;
      } catch {
        errors++;
      }
      durations.push(performance.now() - start);
      await new Promise((r) => setTimeout(r, 50));
    }
  }),
);
durations.sort((a, b) => a - b);
const percentile = (p) =>
  Math.round(
    durations[
      Math.min(durations.length - 1, Math.floor(durations.length * p))
    ] ?? 0,
  );
const report = {
  createdAt: new Date().toISOString(),
  target: origin.origin,
  concurrency,
  seconds,
  requests: durations.length,
  requestsPerSecond: Math.round((durations.length / seconds) * 10) / 10,
  p50Ms: percentile(0.5),
  p95Ms: percentile(0.95),
  p99Ms: percentile(0.99),
  errors,
  statuses,
  scope:
    'Local bounded read-only smoke load; 429 separately counted, no production capacity claim.',
};
const file = option('--out', '/tmp/pettly-load-report.json');
await writeFile(file, JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
console.log(JSON.stringify(report));
if (errors) process.exitCode = 1;
