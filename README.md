# Pettly System

Monorepo base para la plataforma Pettly, gestionado con Nx y pnpm workspaces.

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

Las bases de la API NestJS, la web Next.js y el backoffice Angular están en `apps/api`, `apps/web` y `apps/admin`. La app Flutter está en `apps/mobile`. El worker y los paquetes se añadirán después.

Aplicaciones previstas:

- `apps/admin`: Angular, panel de empresas, refugios y superadministradores.
- `apps/web`: Next.js, web del cliente.
- `apps/api`: NestJS, API y reglas de negocio.
- `apps/worker`: Node.js, tareas en segundo plano cuando sean necesarias.

Paquetes previstos:

- `packages/api-client`: cliente generado desde OpenAPI.
- `packages/config`: configuración compartida.

Nx usa caché local. La base no requiere Nx Cloud ni servicios externos.
Los plugins de Angular, Next.js y NestJS se instalarán al generar sus aplicaciones.
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

Esta base incluye el módulo, controlador y servicio iniciales de NestJS.

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

El workspace usa configuración TypeScript compartida sin referencias de proyectos para mantener compatibilidad con Angular.

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
pnpm docker:up
```

La API, la web y el backoffice usan `shared-network`; PostgreSQL corresponde al servicio externo `global_postgres`. La app Flutter se mantiene fuera de Docker.

Consulta [docs/development.md](docs/development.md) para hooks, puertos y configuración de base de datos.
