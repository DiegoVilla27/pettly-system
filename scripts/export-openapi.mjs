import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const result = spawnSync(process.execPath, ['apps/api/dist/main.js'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    OPENAPI_OUTPUT: 'apps/api/openapi.json',
    JWT_SECRET: 'openapi-build-key-not-for-runtime-use',
    MAIL_ENCRYPTION_KEY: 'openapi-mail-key-not-for-runtime-use',
    REDIS_URL: 'redis://127.0.0.1:1',
  },
});
if (result.status !== 0) process.exit(result.status || 1);
const spec = JSON.parse(readFileSync('apps/api/openapi.json', 'utf8'));
for (const [path, methods] of Object.entries(spec.paths))
  for (const [method, operation] of Object.entries(methods)) {
    if (!operation.operationId || !operation.summary || !operation.responses)
      throw new Error(`Incomplete OpenAPI operation: ${method} ${path}`);
  }
const ids = Object.values(spec.paths).flatMap((methods) =>
  Object.values(methods).map((o) => o.operationId),
);
if (new Set(ids).size !== ids.length)
  throw new Error('Duplicate OpenAPI operationId.');
console.log(`OpenAPI generated and checked: ${ids.length} operations.`);
