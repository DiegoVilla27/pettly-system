import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { classifyChanges, checkBranchPolicy } from './detect-changes.mjs';
import { evaluateGate } from './quality-gate.mjs';

const all = { api: true, web: true, admin: true, mobile: true, docker: true };

test('jobs que solo usan Node desactivan la caché automática de pnpm', () => {
  for (const file of ['ci.yml', 'docker.yml']) {
    const workflow = readFileSync(
      new URL(`../../.github/workflows/${file}`, import.meta.url),
      'utf8',
    );
    const steps = workflow.match(
      /- uses: actions\/setup-node@v5\n[\s\S]*?(?=\n {6}-|$)/g,
    );
    assert.ok(steps?.length, file);
    for (const step of steps)
      assert.match(step, /package-manager-cache: false/, file);
  }
});

test('cambios compartidos activan todas las aplicaciones y Docker', () => {
  for (const file of [
    'pnpm-lock.yaml',
    'package.json',
    'nx.json',
    'packages/api-client/index.ts',
    '.github/actions/setup-node-pnpm/action.yml',
    'scripts/ci/quality-gate.mjs',
    'tsconfig.base.json',
  ])
    assert.deepEqual(classifyChanges([file]), all, file);
});

test('un cambio en API activa las comprobaciones Docker de todos sus consumidores', () => {
  assert.deepEqual(classifyChanges(['apps/api/src/app/app.controller.ts']), {
    api: true,
    web: false,
    admin: false,
    mobile: false,
    docker: true,
  });
});

test('mobile no activa contenedores y documentación no recompila aplicaciones', () => {
  assert.deepEqual(classifyChanges(['apps/mobile/lib/main.dart']), {
    api: false,
    web: false,
    admin: false,
    mobile: true,
    docker: false,
  });
  assert.deepEqual(classifyChanges(['README.md']), {
    api: false,
    web: false,
    admin: false,
    mobile: false,
    docker: false,
  });
});

test('ejecución manual completa ignora filtros de cambios', () =>
  assert.deepEqual(classifyChanges([], true), all));

test('la política main permite solo dev del mismo repositorio', () => {
  checkBranchPolicy('pull_request', 'main', 'dev', 'owner/repo', 'owner/repo');
  assert.throws(() =>
    checkBranchPolicy(
      'pull_request',
      'main',
      'feature',
      'owner/repo',
      'owner/repo',
    ),
  );
  assert.throws(() =>
    checkBranchPolicy('pull_request', 'main', 'dev', 'fork/repo', 'owner/repo'),
  );
  checkBranchPolicy(
    'pull_request',
    'dev',
    'feature',
    'fork/repo',
    'owner/repo',
  );
});

function fixture() {
  const changes = {
    api: 'true',
    web: 'false',
    admin: 'false',
    mobile: 'false',
    docker: 'true',
  };
  const needs = Object.fromEntries(
    ['changes', 'repository', 'api', 'docker'].map((name) => [
      name,
      { result: 'success' },
    ]),
  );
  for (const name of ['web', 'admin', 'mobile'])
    needs[name] = { result: 'skipped' };
  return { changes, needs };
}

test('quality gate acepta solo controles requeridos aprobados', () => {
  const { changes, needs } = fixture();
  assert.deepEqual(evaluateGate(needs, changes), []);
  for (const result of ['failure', 'cancelled', 'skipped']) {
    assert.ok(
      evaluateGate({ ...needs, docker: { result } }, changes).length > 0,
      result,
    );
  }
});

test('no hay falso éxito si faltan outputs o falla la política del repositorio', () => {
  const { changes, needs } = fixture();
  assert.ok(evaluateGate(needs, {}).length > 0);
  assert.ok(
    evaluateGate({ ...needs, changes: { result: 'failure' } }, changes).length >
      0,
  );
  assert.ok(
    evaluateGate({ ...needs, repository: { result: 'skipped' } }, changes)
      .length > 0,
  );
});
