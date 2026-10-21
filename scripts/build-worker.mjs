import { build } from 'esbuild';
await build({
  entryPoints: ['apps/worker/src/main.ts'],
  bundle: true,
  platform: 'node',
  packages: 'external',
  outfile: 'apps/worker/dist/main.js',
});
