# Desarrollo, commits y Docker

## Rama de trabajo

Trabajar en ramas `codex/*` basadas en `dev`. Users/Auth se implementan en `codex/api-modules`. Leer DESIGN y los documentos de módulos antes de cada tarea.

## Husky y Conventional Commits

`pnpm install --frozen-lockfile` activa Husky mediante el script `prepare`.

- `commit-msg`: valida el mensaje con commitlint y Conventional Commits.
- `pre-commit`: ejecuta lint-staged. Formatea archivos del commit, aplica ESLint según la aplicación y comprueba tipos para el código modificado. Si hay cambios Dart o en sus dependencias, formatea Dart y ejecuta `flutter analyze`.
- `pre-push`: exige Docker activo, `.env` y la red `shared-network`; reconstruye y actualiza API, web, admin, worker y Mailpit con `docker compose up --build -d --wait`. Si una imagen falla o un servicio no queda saludable, cancela el push. Los contenedores quedan en ejecución tras la validación, igual que en task-manager-system.

Ejemplos:

```text
feat(api): add organization endpoints
fix(web): correct product navigation
chore(infra): configure husky and docker
```

Users/Auth tienen suites unitarias e integración ejecutadas en CI. El hook pre-push verifica compilación y arranque Docker; las pruebas de negocio pueden ejecutarse con los comandos indicados abajo.
Flutter se necesita para commits con cambios Dart; no se ejecuta ni se incluye en Docker.

## Docker

Las imágenes tienen etapas de compilación y ejecución:

- API: NestJS compilado y dependencias de producción, con usuario Node sin privilegios.
- Web: Next.js en modo standalone, con usuario Node sin privilegios.
- Admin: Angular compilado servido por Nginx, con fallback para las rutas de la SPA.

```sh
cp .env.example .env
# Ajusta puertos y credenciales locales en .env.
pnpm docker:config
pnpm docker:up
pnpm docker:logs
pnpm docker:down
```

Puertos predeterminados para convivir con task-manager y los servidores de desarrollo:

| Servicio | URL Docker                | URL desarrollo            |
| -------- | ------------------------- | ------------------------- |
| API      | http://localhost:3100/api | http://localhost:3000/api |
| Web      | http://localhost:3101     | http://localhost:3001     |
| Admin    | http://localhost:4300     | http://localhost:4200     |

`.env` no se versiona ni entra en las imágenes. `.env.example` contiene la configuración de referencia y no incluye credenciales.

## PostgreSQL compartido

Compose utiliza la red externa `shared-network` y el PostgreSQL existente `global_postgres:5432`, siguiendo la configuración de task-manager-system. No crea un contenedor PostgreSQL ni modifica su configuración o sus bases existentes.

Si la infraestructura compartida no existe, arráncala con su configuración habitual. Para comprobarla:

```sh
docker network inspect shared-network
docker inspect global_postgres
```

La API Prisma recibe `DATABASE_URL` al ejecutar localmente y `DATABASE_URL_DOCKER` mediante Compose. La base `pettly_db` y el rol dedicado `pettly_dev` ya están creados en esta máquina. Para otra máquina, crear esa base y su rol con la administración habitual del PostgreSQL compartido; no usar una cuenta superusuario en la aplicación. Codificar caracteres especiales de contraseña en las URLs.

Las migraciones están en `apps/api/prisma/migrations`. `pnpm db:generate` genera el cliente y `pnpm db:migrate` aplica migraciones a DATABASE_URL. La imagen Docker de desarrollo aplica migraciones antes de iniciar la API; la plantilla de producción usa un job de migración dedicado. La API conecta PostgreSQL al arrancar. `/api/health/ready` comprueba PostgreSQL y Redis; la entrega SMTP se verifica por separado.

`API_INTERNAL_URL=http://api:3000/api` prepara el acceso desde el servidor Next.js. El navegador usa el puerto público de la API. Todavía no hay llamadas de la web o el backoffice a la API integradas con los nuevos módulos de autenticación.

## Validación manual

```sh
pnpm check:server
pnpm format:check
pnpm docker:config
pnpm docker:up
```

Las compilaciones Docker excluyen `apps/mobile`, cachés, dependencias locales, `.git` y archivos de entorno. Husky se desactiva dentro de las imágenes con `HUSKY=0`.

## Redis, secrets and local email

Redis uses the existing `global_redis` in `shared-network`. Set REDIS_URL for host development and REDIS_URL_DOCKER for Compose. REDIS_PREFIX must distinguish project/environment; never flush the shared server. Counters and BullMQ have project prefixes. Protected operations return 503 if the limiter is unavailable.

Generate independent secrets with `openssl rand -hex 48` and put each in JWT_SECRET and MAIL_ENCRYPTION_KEY. Keep `.env` private and untracked. Configure CORS_ORIGINS and WEB_PUBLIC_URL for the clients you actually use. Production requires HTTPS, Secure cookies and SMTP configuration; ALLOW_INSECURE_LOCAL_DEV is only for local Docker. Swagger requires SWAGGER_ENABLED=true in production.

Compose runs Mailpit on localhost:1025 (SMTP) and localhost:8025 (inbox). The worker uses mailpit:1025 internally. For native API/worker development:

```sh
docker compose up -d mailpit
pnpm db:generate
pnpm db:migrate
pnpm dev:api
# In another terminal:
pnpm dev:worker
```

The development worker and Docker worker share the configured queue; run the variant you intend to test. Native defaults use localhost:1025; production provider configuration uses SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASSWORD and MAIL_FROM. No email credentials are committed.

## Users/Auth checks

```sh
pnpm test:api
pnpm test:api:integration
pnpm check:architecture
pnpm docs:api
```

Integration creates isolated PostgreSQL, Redis and Mailpit with random host ports in a unique Compose project, builds API/worker, applies migrations, executes HTTP scenarios and removes that project's containers/volumes/network. It does not access the shared development services. Docker must be running.

OpenAPI export does not require live infrastructure. Swagger UI is `/api/docs`, JSON `/api/openapi.json`. Authentication flows and client headers are detailed in [auth.md](auth.md).

## First administrator and expanded profile

New registrations require name and lastName. Contact/address/birth-date fields are optional; age is returned as a calculated value. See [Users](users.md) for validations, partial updates and the super_admin-only status endpoint.

After registering and verifying the intended administrator account, provision the first global role explicitly:

```sh
pnpm users:bootstrap-super-admin --email your-verified-account@example.com
```

This command uses DATABASE_URL from the local environment, not DATABASE_URL_DOCKER; it is audited and first-use only. No account is automatically promoted. The new additive Prisma migration runs through `pnpm db:migrate` or Docker startup.

## Gestión de usuarios y seguridad de cuentas

Migración `202610080005_users_management_security` añade deletedAt/pendingEmail, propósitos de invitación/cambio de correo, auditoría y restricciones de anonimización. Instala la extensión PostgreSQL confiable pg_trgm en la base dedicada para índices de búsqueda; el operador de migraciones debe disponer de permiso CREATE sobre esa base. No altera otras bases del PostgreSQL compartido.

Swagger sigue en http://localhost:3100/api/docs. Los correos de invitación/cambio de dirección están en Mailpit (http://localhost:8025); las páginas web que consumen los enlaces todavía no están implementadas. Para probar manualmente, extraer el token del fragmento del enlace y enviarlo al endpoint indicado en docs/auth.md. Crear y eliminar solo cuentas de prueba cuando se compruebe la anonimización irreversible. OTP/SMS está en pausa y no requiere configurar ningún proveedor.

Migration `202610080006_organization_lifecycle` adds organization profiles, review/operational status, optimistic versions, registration uniqueness and a deferred responsible-membership constraint. Existing identities become drafts and require explicit approval; migration does not grant accounts roles. Organizations uses the existing PostgreSQL instance on shared-network and no additional Redis database/service.

Migration `202610080007_animals_media_adoptions` adds private animal records, bounded sanitized JPEG bytea storage, attachments, moderated publication snapshots, consented applications and immutable audits. It preserves existing identities and grants no memberships. No new shared services or credentials are required. Media uses the current dedicated PostgreSQL database; review its documented storage/backup capacity tradeoff before large-scale image expansion.

Migration `202610080008_catalog_inventory` adds business taxonomy/products/variants/photos/audit and durable variant stock/holds/movements. Inventory deadline processing runs in the API every fifteen seconds and on private stock access; PostgreSQL guards ledger consistency and command idempotency. No new shared service or provider credential is required. Only the dedicated Pettly database receives this migration. Read Catalog/Inventory module guides for minor-unit money and manual checks.

Migration `202610090009_cart_orders` adds persistent carts, quotes, orders, explicit commercial policies and immutable revision audits. Order-linked reservations are foreign-key bound to orders and cannot be consumed through operational Inventory endpoints. API recovers unpaid deadlines at startup and every fifteen seconds; no additional shared service is needed. Configure actual business delivery/tax/collector terms explicitly before checkout. This migration creates no enabled policy or real charge. Read Cart/Orders module guides for authenticated routes and manual checks. The system-port integration helper is excluded from API builds and refuses databases other than the temporary loopback pettly_test database.

## Payments core

Migration `202610090010_payments_core` creates attempts, provider observations, capture ledger, immutable audit and leased financial outbox jobs. New orders reserve thirty minutes; old snapshots/deadlines remain immutable. Root `.env` variable `PETTLY_COMMISSION_PERCENT=10` is forwarded to API/worker by Compose. Change the value (0–100, up to two decimals), recreate/restart API and obtain a new quote; accepted orders retain their rate. Current provider is disabled: no credentials are needed to prepare attempts and inspect Swagger, but checkout URLs, external charges/refunds and webhooks are unavailable. API processes durable jobs at startup/every fifteen seconds; notification worker remains separate. Only dedicated Pettly DB receives this migration. Payment/order system-port test helpers require temporary loopback pettly_test and are never application endpoints. See [Payments](payments.md) and [activation inquiry](payments-provider-onboarding.md).

## Services and Bookings

Migration `202610090011_services_bookings` adds six tables (services/resources/blocks/audit and bookings/audit), allocation/calendar/evidence guards and notification-outbox scheduling. No extra service, credential or environment variable is needed: existing dedicated PostgreSQL, prefixed Redis, API expiry scheduler, worker and Mailpit are reused. Apply only to Pettly DB, never another database in shared-network. Timezone is America/Bogota and money COP minor units (100 = 1 COP). Initial booking collection is pay_at_business; configuring product payment commission does not activate booking charges. See [Services](services.md), [Bookings](bookings.md) and [Notifications](notifications.md) for routes, policies and manual checks. Isolated booking expiry/attendance clock helper refuses shared development DB and is excluded from runtime builds. API/swagger stay http://localhost:3100/api/docs; local inbox http://localhost:8025.

## Notifications migration and local operation

Migration `202610090012_notifications` adds recipient inbox/preferences and immutable delivery-retry audit, extending the existing encrypted outbox. Existing Pettly DB, Redis prefix and SMTP settings are reused; no new environment variable or manual credential is needed locally. Apply only to `pettly_db` in shared-network. Swagger Notifications tag documents eight endpoints; Mailpit remains http://localhost:8025. See [Notifications](notifications.md) for permissions, preferences, safe retry, manual checks and remaining production sender/retention requirements. Never force failures in shared development data; isolated tests exercise them.

Notifications local release verified on 2026-10-09: migration 012 applied only in pettly_db as pettly_dev; API/worker/Mailpit healthy. Three new tables, six guards and eight Swagger operations verified without inserting shared business fixtures. Automated checks: 62 unit tests, 61 isolated integration scenarios, lint/types/build, Prisma schema, architecture/format and 176-operation OpenAPI.

## Veterinary and operations

Migration 013 adds private credential/audit, clinical service/resource/booking guards and maintenance/metrics indexes; apply only to Pettly DB. No new professional/role is seeded. API readiness now checks PostgreSQL+Redis; worker healthcheck verifies its heartbeat. Local METRICS_TOKEN and PETTLY_BACKUP_KEY are independent private .env values, never committed; prepare Prometheus token under ignored tmp and keep backup keys separately recoverable. Backups are excluded from Git/Docker. Read [Veterinary](veterinary.md) and [Operations](operations.md) for manual contracts, retention dry-run, verified restore, measured load, private monitoring and production templates. Actual external hosting/alerts/backup storage need operator choices; no production deployment has occurred.
