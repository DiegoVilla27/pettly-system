import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function evaluateGate(needs, changes) {
  const failures = [];
  for (const name of ['changes', 'repository']) {
    if (needs[name]?.result !== 'success')
      failures.push(`${name}: ${needs[name]?.result || 'missing'}`);
  }
  for (const project of ['api', 'web', 'admin', 'mobile', 'docker']) {
    const expected = changes?.[project];
    if (expected !== 'true' && expected !== 'false') {
      failures.push(`${project}: missing change detection output`);
      continue;
    }
    const actual = needs[project]?.result;
    if (expected === 'true' && actual !== 'success')
      failures.push(`${project}: ${actual || 'missing'}`);
    if (expected === 'false' && actual !== 'skipped' && actual !== 'success')
      failures.push(`${project}: ${actual || 'missing'}`);
  }
  return failures;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const needs = JSON.parse(process.env.NEEDS_JSON);
  const changes = needs.changes?.outputs;
  const failures = evaluateGate(needs, changes);
  const summary = [
    '## Pettly CI Quality Gate',
    '',
    '| Job | Resultado |',
    '| --- | --- |',
    ...Object.entries(needs).map(
      ([name, job]) => `| ${name} | ${job.result} |`,
    ),
    '',
    failures.length
      ? `Fallos: ${failures.join('; ')}`
      : 'Todos los controles requeridos pasaron.',
  ];
  if (process.env.GITHUB_STEP_SUMMARY)
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary.join('\n') + '\n');
  console.log(summary.join('\n'));
  if (failures.length) process.exitCode = 1;
}
