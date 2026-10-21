import { spawnSync } from 'node:child_process';
const args = process.argv.slice(2).filter((arg) => arg !== '--');
if (args.length !== 2 || args[0] !== '--email' || !args[1]) {
  process.stderr.write(
    'Usage: pnpm users:bootstrap-super-admin --email <verified-account-email>\n',
  );
  process.exit(1);
}
const result = spawnSync(
  process.execPath,
  ['apps/api/dist/main.js', '--bootstrap-super-admin', args[1]],
  { env: process.env, stdio: 'inherit' },
);
process.exitCode = result.status ?? 1;
