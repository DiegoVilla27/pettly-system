import { execFileSync, spawnSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';

const [project, kind] = process.argv.slice(2);
if (
  !['api', 'web', 'admin'].includes(project) ||
  !['unit', 'integration'].includes(kind)
)
  throw new Error('Invalid project or test kind');
const config = JSON.parse(
  execFileSync('pnpm', ['exec', 'nx', 'show', 'project', project, '--json'], {
    encoding: 'utf8',
  }),
);
const candidates =
  kind === 'unit' ? ['test:unit', 'test'] : ['test:integration'];
const target = candidates.find((name) => config.targets?.[name]);
let state = 'not_configured';
if (target) {
  const result = spawnSync(
    'pnpm',
    ['exec', 'nx', 'run', `${project}:${target}`],
    { stdio: 'inherit' },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
  state = 'success';
} else
  console.log(
    `${project}: no hay suite ${kind} configurada. No se han ejecutado pruebas de aplicación.`,
  );
if (process.env.GITHUB_OUTPUT)
  appendFileSync(process.env.GITHUB_OUTPUT, `state=${state}\n`);
if (process.env.GITHUB_STEP_SUMMARY)
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    `### ${project}: pruebas ${kind}\n\nEstado: **${state}**.\n`,
  );
