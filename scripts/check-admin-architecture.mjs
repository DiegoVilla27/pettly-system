import { readdirSync, readFileSync } from 'node:fs';
import { resolve, relative, dirname } from 'node:path';
import ts from 'typescript';
const root = resolve('apps/admin/src/app');
const walk = (path) =>
  readdirSync(path, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? walk(resolve(path, entry.name))
      : [resolve(path, entry.name)],
  );
let components = 0;
const failures = [];
for (const file of walk(root).filter(
  (file) => file.endsWith('.ts') && !file.endsWith('.spec.ts'),
)) {
  const content = readFileSync(file, 'utf8');
  const source = ts.createSourceFile(
    file,
    content,
    ts.ScriptTarget.Latest,
    true,
  );
  const name = relative(root, file);
  const visit = (node) => {
    if (
      ts.isCallExpression(node) &&
      node.expression.getText(source) === 'Component'
    ) {
      components++;
      const metadata = node.arguments[0];
      const property =
        metadata && ts.isObjectLiteralExpression(metadata)
          ? metadata.properties.find(
              (p) =>
                ts.isPropertyAssignment(p) &&
                p.name.getText(source) === 'changeDetection',
            )
          : undefined;
      if (
        !property ||
        !ts.isPropertyAssignment(property) ||
        property.initializer.getText(source) !==
          'ChangeDetectionStrategy.OnPush'
      )
        failures.push(`${name}: every component must explicitly use OnPush.`);
    }
    if (
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      const specifier = node.moduleSpecifier.text;
      if (specifier.includes('zone.js') || specifier.includes('apps/api/'))
        failures.push(`${name}: forbidden framework/backend import.`);
      if (name.startsWith('features/') && specifier.startsWith('.')) {
        const target = relative(root, resolve(dirname(file), specifier));
        if (
          target.startsWith('features/') &&
          target.split('/')[1] !== name.split('/')[1]
        )
          failures.push(`${name}: cross-feature internal import.`);
        if (
          target.startsWith('core/') &&
          !['core/auth', 'core/api'].includes(target)
        )
          failures.push(`${name}: import only public core contracts.`);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  if (
    /\b(?:localStorage|sessionStorage)\b/.test(content) &&
    !name.endsWith('session-coordination.ts')
  )
    failures.push(
      `${name}: persistence belongs only to nonsecret browser coordination.`,
    );
}
const config = readFileSync(resolve(root, 'app.config.ts'), 'utf8');
if (!config.includes('provideZonelessChangeDetection()'))
  failures.push('Explicit zoneless provider is required.');
if (failures.length) throw Error(failures.join('\n'));
console.log(
  `Admin architecture passed: ${components} components explicitly OnPush, zoneless and feature boundaries.`,
);
