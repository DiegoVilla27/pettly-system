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
// Unconstrained nullable strings can become arrays during Swagger DTO reflection.
// Keep these frontend-consumed contracts aligned with their actual JSON values.
const organization =
  spec.components.schemas.OrganizationProfileResponseDto.properties;
for (const field of [
  'legalName',
  'registrationNumber',
  'description',
  'phone',
  'countryCode',
  'region',
  'city',
  'address',
  'addressLine2',
  'postalCode',
  'reviewReason',
]) {
  if (
    organization[field]?.type !== 'string' ||
    organization[field]?.nullable !== true
  )
    throw new Error(
      `OrganizationProfileResponseDto.${field} must be nullable text.`,
    );
}
const audit =
  spec.components.schemas.OrganizationAuditResponseDto.properties.items.items
    .properties;
for (const field of ['previousValue', 'nextValue']) {
  if (audit[field]?.type !== 'string' || audit[field]?.nullable !== true)
    throw new Error(
      `OrganizationAuditResponseDto.${field} must be nullable text.`,
    );
}
const veterinaryReference =
  spec.components.schemas.CredentialResponseDto.properties
    .verificationReference;
if (
  veterinaryReference?.type !== 'string' ||
  veterinaryReference?.nullable !== true
)
  throw new Error(
    'CredentialResponseDto.verificationReference must be nullable text.',
  );
for (const [name, field] of [
  ['CategoryResponseDto', 'description'],
  ['ProductResponseDto', 'brand'],
  ['ProductResponseDto', 'reviewReason'],
  ['ServiceResponseDto', 'reviewReason'],
  ['PaymentResponseDto', 'reference'],
]) {
  const property = spec.components.schemas[name].properties[field];
  if (property?.type !== 'string' || property?.nullable !== true)
    throw new Error(`${name}.${field} must be nullable text.`);
}
for (const name of ['AnimalResponseDto', 'AnimalDetailDto']) {
  for (const field of ['vaccinated', 'neutered']) {
    const property = spec.components.schemas[name].properties[field];
    if (property?.type !== 'boolean' || property?.nullable !== true)
      throw new Error(`${name}.${field} must be nullable boolean.`);
  }
}
console.log(`OpenAPI generated and checked: ${ids.length} operations.`);

for (const name of [
  'PublicationResponseDto',
  'AdoptionRequestResponseDto',
  'AdoptionRequestDetailDto',
]) {
  const field = spec.components.schemas[name].properties.reviewReason;
  if (field.type !== 'string' || field.nullable !== true)
    throw new Error(`Invalid nullable adoption review reason: ${name}`);
}
