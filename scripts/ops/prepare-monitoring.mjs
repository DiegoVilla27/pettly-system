import { createRequire } from 'node:module';
import { mkdir, writeFile, chmod } from 'node:fs/promises';
const require = createRequire(
  new URL('../../apps/api/package.json', import.meta.url),
);
require('dotenv').config({ quiet: true });
const token = process.env.METRICS_TOKEN;
if (!token || token.length < 32)
  throw Error('Configure METRICS_TOKEN with at least 32 characters.');
await mkdir('tmp/monitoring', { recursive: true, mode: 0o700 });
await chmod('tmp/monitoring', 0o700);
await writeFile('tmp/monitoring/metrics-token', token, { mode: 0o644 });
console.log(
  'Prepared token file inside private ignored directory; token value omitted.',
);
