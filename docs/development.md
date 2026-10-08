# Desarrollo, commits y Docker

## Rama de trabajo

La configuración inicial se desarrolla en `codex/husky-docker-setup`, creada desde `origin/dev`.

## Husky y Conventional Commits

`pnpm install --frozen-lockfile` activa Husky mediante el script `prepare`.

- `commit-msg`: valida el mensaje con commitlint y Conventional Commits.
- `pre-commit`: ejecuta lint-staged. Formatea archivos del commit, aplica ESLint según la aplicación y comprueba tipos para el código modificado. Si hay cambios Dart o en sus dependencias, formatea Dart y ejecuta `flutter analyze`.
- `pre-push`: exige Docker activo, `.env` y la red `shared-network`; reconstruye y actualiza los tres contenedores con `docker compose up --build -d --wait`. Si una imagen falla o un servicio no queda saludable, cancela el push. Los contenedores quedan en ejecución tras la validación, igual que en task-manager-system.

Ejemplos:

```text
feat(api): add organization endpoints
fix(web): correct product navigation
chore(infra): configure husky and docker
```

No se ejecutan pruebas de aplicación inexistentes. Cuando añadamos tests, se incorporarán a los controles correspondientes.
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

La API recibe `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` y `DB_PASSWORD`. Usa una base dedicada `pettly_db` y configura sus credenciales en `.env` antes de implementar persistencia.

**La API todavía no contiene un ORM, migraciones ni conexión a base de datos.** Estas variables preparan el entorno; el healthcheck comprueba HTTP y no valida PostgreSQL. La creación de `pettly_db` y la conexión efectiva se abordarán al implementar la capa de datos.

`API_INTERNAL_URL=http://api:3000/api` prepara el acceso desde el servidor Next.js. El navegador usa el puerto público de la API. Todavía no hay llamadas de la web o el backoffice a la API ni autenticación configuradas.

## Validación manual

```sh
pnpm check:server
pnpm format:check
pnpm docker:config
pnpm docker:up
```

Las compilaciones Docker excluyen `apps/mobile`, cachés, dependencias locales, `.git` y archivos de entorno. Husky se desactiva dentro de las imágenes con `HUSKY=0`.
