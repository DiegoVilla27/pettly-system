import { spawnSync } from 'node:child_process';
let closing = false;
process.once('SIGTERM', () => {
  closing = true;
});
process.once('SIGINT', () => {
  closing = true;
});
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
while (!closing) {
  const args = [
    'scripts/ops/retention.mjs',
    ...(process.env.RETENTION_APPLY === 'true' ? ['--apply'] : []),
  ];
  const result = spawnSync(process.execPath, args, {
    stdio: 'inherit',
    env: process.env,
    timeout: 30000,
  });
  if (result.status !== 0)
    process.stderr.write(
      JSON.stringify({ level: 'error', event: 'retention_failed' }) + '\n',
    );
  for (let i = 0; i < 900 && !closing; i++) await delay(1000);
}
