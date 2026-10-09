import { readdirSync, readFileSync } from 'node:fs';
import { resolve, relative, dirname, sep } from 'node:path';
import ts from 'typescript';
const root = resolve('apps/api/src');
function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? files(resolve(dir, e.name))
      : e.name.endsWith('.ts')
        ? [resolve(dir, e.name)]
        : [],
  );
}
const violations = [];
for (const file of files(root)) {
  const name = relative(root, file).split(sep).join('/');
  const source = ts.createSourceFile(
    file,
    readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  );
  const imports = [];
  function visit(node) {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    )
      imports.push(node.moduleSpecifier.text);
    if (
      ts.isCallExpression(node) &&
      node.arguments.length &&
      ts.isStringLiteral(node.arguments[0]) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) &&
          node.expression.text === 'require'))
    )
      imports.push(node.arguments[0].text);
    ts.forEachChild(node, visit);
  }
  visit(source);
  for (const entry of imports) {
    const target = entry.startsWith('.')
      ? relative(root, resolve(dirname(file), entry))
          .split(sep)
          .join('/')
      : entry;
    const core = /\/(domain|application)\//.test('/' + name);
    if (core && !entry.startsWith('.') && !entry.startsWith('node:'))
      violations.push(`${name}: core imports external package ${entry}`);
    if (core && /(?:adapters|infrastructure)\//.test(target))
      violations.push(`${name}: core imports adapter ${entry}`);
    if (name.includes('/domain/') && target.includes('/application/'))
      violations.push(`${name}: domain depends on application ${entry}`);
    if (name.includes('/adapters/out/') && target.includes('/adapters/in/'))
      violations.push(`${name}: outbound adapter imports HTTP ${entry}`);
    const own = name.match(/^modules\/([^/]+)/)?.[1],
      other = target.match(/^modules\/([^/]+)/)?.[1];
    if (
      own &&
      other &&
      own !== other &&
      !/\/application\/(ports|results)\//.test(target) &&
      !(name.endsWith('.module.ts') && target.endsWith('.module'))
    )
      violations.push(`${name}: imports another feature's internals ${entry}`);
  }
}
if (violations.length) throw new Error(violations.join('\n'));
console.log('API architecture boundaries passed.');
