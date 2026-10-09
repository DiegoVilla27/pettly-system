# Pettly System

Monorepo base para la plataforma Pettly, gestionado con Nx y pnpm workspaces.

Consulta [DESIGN.md](DESIGN.md) para la arquitectura acordada, los módulos previstos y el estado de implementación. Se actualizará junto con cada cambio del sistema.

## Requisitos

- Node.js 22.12 o superior dentro de la rama 22, o Node.js 24.
- pnpm 11.24.0 (versión fijada en `package.json`).

## Inicio

```sh
pnpm install --frozen-lockfile
pnpm nx show projects
pnpm graph
pnpm format:check
pnpm check
```

## Estructura

```text
apps/          Aplicaciones desplegables
packages/      Bibliotecas y configuración compartida
```

Las bases de la API NestJS, la web Next.js y el backoffice Angular están en `apps/api`, `apps/web` y `apps/admin`. La app Flutter está en `apps/mobile`. El worker de correo está en `apps/worker` y su runtime compartido en `packages/notifications-runtime`.

Aplicaciones:

- `apps/admin`: Angular, panel de empresas, refugios y superadministradores.
- `apps/web`: Next.js, web del cliente.
- `apps/api`: NestJS, API y reglas de negocio.
- `apps/worker`: Node.js/BullMQ, envío asíncrono de correos.

Paquetes previstos:

- `packages/api-client`: cliente generado desde OpenAPI.
- `packages/config`: configuración compartida.

Nx usa caché local. La base no requiere Nx Cloud ni servicios externos.
`pnpm check` ejecuta los targets disponibles de los proyectos.

## API

```sh
pnpm dev:api
```

La API escucha en `http://localhost:3000/api` y devuelve `{"message":"Hello API"}`.
Para cambiar el puerto: `PORT=3001 pnpm dev:api`.

```sh
pnpm build:api
pnpm nx lint api
pnpm nx typecheck api
```

La API implementa Users/Auth, Authorization/Organizations, Animals/Media/Adoptions, Catalog/Inventory y Cart/Orders con arquitectura hexagonal y DDD. Usa Prisma/PostgreSQL, JWT, rotación de sesiones, verificación y recuperación, publicaciones moderadas, stock transaccional y cotización/pedidos con consentimiento. Configura `.env`, ejecuta `pnpm db:generate` y `pnpm db:migrate` antes del arranque local. El worker requiere Mailpit o SMTP configurado.

Swagger: `http://localhost:3000/api/docs`; JSON: `/api/openapi.json`. En Docker usa el puerto 3100.

```sh
pnpm dev:worker
pnpm test:api
pnpm test:api:integration
pnpm check:architecture
pnpm docs:api
```

Los DTO de entrada/salida usan Zod y Swagger deriva de esos contratos. Users incluye perfil ampliado y administración de estado para super_admin.

Documentación: [Users](docs/users.md), [Auth](docs/auth.md) y [Notifications](docs/notifications.md).

## Web cliente

Next.js con App Router, TypeScript y CSS.

```sh
pnpm dev:web
```

Abre `http://localhost:3001`. La API usa el puerto 3000, por lo que ambas aplicaciones pueden ejecutarse juntas.

```sh
pnpm build:web
pnpm nx lint web
pnpm nx typecheck web
```

## Backoffice

Angular con componentes standalone, routing, TypeScript estricto y CSS.

```sh
pnpm dev:admin
```

Abre `http://localhost:4200`.

```sh
pnpm build:admin
pnpm nx lint admin
pnpm nx typecheck admin
```

El workspace usa configuración TypeScript compartida; las referencias de la biblioteca Node son gestionadas por Nx.

## App móvil

Flutter para Android e iOS en `apps/mobile`. Requiere Flutter 3.41.4 y el SDK de la plataforma correspondiente.

```sh
pnpm dev:mobile
pnpm check:mobile
pnpm build:mobile:android
pnpm build:mobile:ios
```

Más detalles en [apps/mobile/README.md](apps/mobile/README.md).

## Commits y contenedores

Husky valida Conventional Commits, revisa los archivos del commit y reconstruye los contenedores antes del push.

```sh
cp .env.example .env
# Configura las URLs, dos secretos aleatorios y credenciales antes de arrancar.
pnpm docker:up
```

La API, web, backoffice y worker usan `shared-network`; PostgreSQL y Redis corresponden a `global_postgres` y `global_redis`. Mailpit captura correos en `http://localhost:8025`. La app Flutter se mantiene fuera de Docker.

Consulta [docs/development.md](docs/development.md) para hooks, puertos y configuración de base de datos.

## GitHub Actions

CI por aplicación, detección de cambios compartidos, artefactos de compilación, comprobaciones Docker con PostgreSQL temporal y validación final obligatoria.

Consulta [docs/ci.md](docs/ci.md) para ejecutar el pipeline, activar SonarCloud/Discord y proteger las ramas.

## Roles and authorization

Seven fixed roles are implemented. New registrations always start as `user`. Only a current active verified `super_admin` assigns global roles or scoped company/adoption roles; organization administrators cannot assign roles themselves. See [role and permission matrix](docs/authorization.md), [organization membership endpoints](docs/organizations.md) and [global role administration](docs/users.md). Swagger is available at http://localhost:3100/api/docs in Docker.

### User administration and account security

The API provides superadministrator user invitation/search/detail/update/delete/audit endpoints, authenticated password changes, verified email changes, owned session listing/revocation and self-account deletion. See [Users](docs/users.md) and [Auth](docs/auth.md) for exact contracts and manual checks. Swagger: http://localhost:3100/api/docs; local mail inbox: http://localhost:8025. OTP by SMS is paused by explicit user request; the current login flow does not enforce MFA.

Organizations now supports profiles, onboarding requests, review/approval, suspension, responsible administrators, members, search and audit. Only superadmin assigns roles; operational permissions require an active organization. See [Organizations](docs/organizations.md) for endpoints and manual examples.

Animals, Media and Adoptions provide personal/shelter records, sanitized private photos, moderated public listings, explicit-consent applications and atomic handover confirmation. See [Animals](docs/animals.md), [Media](docs/media.md) and [Adoptions](docs/adoptions.md) for exact API contracts and manual testing. Public APIs expose approved snapshots; application contact and clinical notes remain authorized private data.

Catálogo e inventario de la API: [Catalog](docs/catalog.md) y [Inventory](docs/inventory.md). Swagger local: http://localhost:3100/api/docs.

Cart and checkout/order API: [Cart](docs/cart.md), [Orders](docs/orders.md). One-company persistent cart, explicit versioned commercial settings, immutable five-minute quotes and atomic fifteen-minute unpaid order reservations. Cancellation/expiry releases stock; fulfillment requires verified payment through the internal future Payments integration. No real payment provider is configured. Swagger: http://localhost:3100/api/docs.
