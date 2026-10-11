import { readFile, writeFile, mkdir } from 'node:fs/promises';
import openapiTS, { astToString } from 'openapi-typescript';
const directory = 'packages/api-client/src/generated';
const spec = JSON.parse(await readFile('apps/api/openapi.json', 'utf8'));
const ast = await openapiTS(spec, { alphabetize: true });
const routes = {};
for (const [path, methods] of Object.entries(spec.paths)) {
  for (const [method, operation] of Object.entries(methods)) {
    if (!operation.operationId) continue;
    routes[operation.operationId] = {
      method: method.toUpperCase(),
      path: path.replace(/^\/api/, ''),
      authenticated: Boolean(operation.security?.length),
    };
  }
}
const outputs = {
  'schema.ts': astToString(ast),
  'reference-data.ts': `// Generated from OpenAPI. Do not edit.\nexport const countryCodes = ${JSON.stringify(spec.components.schemas.UserResponseDto.properties.countryCode.enum.filter((value) => value !== null))} as const;\n`,
  'routes.ts': `// Generated from the Pettly OpenAPI document. Do not edit.\nexport const operationRoutes = ${JSON.stringify(routes, null, 2)} as const;\n`,
};
await mkdir(directory, { recursive: true });
for (const [name, content] of Object.entries(outputs)) {
  const path = `${directory}/${name}`;
  if (process.argv.includes('--check')) {
    if ((await readFile(path, 'utf8')) !== content)
      throw Error(
        `Stale generated API client: ${path}. Run pnpm api-client:generate.`,
      );
  } else await writeFile(path, content);
}
console.log(
  `API client contracts checked: ${Object.keys(routes).length} operations.`,
);
