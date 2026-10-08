import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const api = `http://127.0.0.1:${process.env.API_PORT || 13100}`;
const web = `http://127.0.0.1:${process.env.WEB_PORT || 13101}`;
const admin = `http://127.0.0.1:${process.env.ADMIN_PORT || 14300}`;
async function get(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, 200, url);
  return response;
}
assert.deepEqual(await (await get(`${api}/api`)).json(), {
  message: 'Hello API',
});
const webHtml = await (await get(web)).text();
assert.match(webHtml, /<h1[^>]*>Pettly<\/h1>/);
const adminHtml = await (await get(admin)).text();
assert.match(adminHtml, /<app-root>/);
const scripts = [...adminHtml.matchAll(/<script[^>]*src="([^"]+)"/g)];
assert.ok(scripts.length > 0, 'Angular debe servir su bundle');
for (const [, file] of scripts) await get(new URL(file, `${admin}/`).href);
assert.match(await (await get(`${admin}/organizations`)).text(), /<app-root>/);
const compose = [
  'compose',
  '-f',
  'docker-compose.yml',
  '-f',
  'docker-compose.ci.yml',
];
execFileSync(
  'docker',
  [
    ...compose,
    'exec',
    '-T',
    'api',
    'node',
    '-e',
    `const net=require('node:net');const socket=net.connect(5432,'global_postgres',()=>socket.end());socket.setTimeout(5000,()=>{socket.destroy();process.exit(1)});socket.on('error',()=>process.exit(1));`,
  ],
  { stdio: 'inherit' },
);
console.log(
  'Docker smoke: API, web, recursos Angular, fallback SPA y red PostgreSQL verificados.',
);
console.log(
  'La API todavía no implementa persistencia: esta comprobación no valida consultas a la base de datos.',
);
