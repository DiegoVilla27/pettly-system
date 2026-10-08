import { appendFileSync } from 'node:fs';

const needs = JSON.parse(process.env.NEEDS_JSON || '{}');
const passed = needs['quality-gate']?.result === 'success';
const lines = [
  '## Pettly CI',
  '',
  `Resultado: **${passed ? 'success' : 'failure'}**`,
  '',
  '| Aplicación | CI | Unitarias | Integración | SonarCloud |',
  '| --- | --- | --- | --- | --- |',
];
for (const name of ['api', 'web', 'admin']) {
  const job = needs[name];
  lines.push(
    `| ${name} | ${job?.result || 'missing'} | ${job?.outputs?.unit_tests || 'no ejecutadas'} | ${job?.outputs?.integration_tests || 'no ejecutadas'} | ${job?.outputs?.sonar || 'no configurado'} |`,
  );
}
lines.push(
  `| mobile | ${needs.mobile?.result || 'missing'} | ${needs.mobile?.outputs?.tests || 'no ejecutadas'} | — | — |`,
);
for (const name of ['docker'])
  lines.push(`| ${name} | ${needs[name]?.result || 'missing'} | — | — | — |`);
lines.push(
  '',
  '`not_configured` significa que no hay suite de aplicación; no equivale a tests ejecutados.',
  '',
  'CD: no configurado. No se ha solicitado ningún despliegue.',
);
const summary = lines.join('\n') + '\n';
console.log(summary);
if (process.env.GITHUB_STEP_SUMMARY)
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);

if (process.env.DISCORD_WEBHOOK) {
  if (process.env.GITHUB_EVENT_NAME === 'pull_request')
    throw new Error('Las notificaciones con secretos no se ejecutan en PR.');
  const response = await fetch(process.env.DISCORD_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(15000),
    body: JSON.stringify({
      username: 'Pettly CI',
      allowed_mentions: { parse: [] },
      embeds: [
        {
          title: `Pettly CI: ${passed ? 'controles aprobados' : 'controles fallidos'}`,
          color: passed ? 3066993 : 15158332,
          description: `[Ver ejecución](${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID})`,
          fields: Object.entries(needs)
            .filter(([name]) => name !== 'changes')
            .map(([name, job]) => ({ name, value: job.result, inline: true })),
        },
      ],
    }),
  });
  if (!response.ok)
    throw new Error(`Discord respondió HTTP ${response.status}`);
}
