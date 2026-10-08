# CI de Pettly

## Flujo

Cada PR hacia `dev` o `main`, y cada push a esas ramas, ejecuta `Pettly CI`:

1. Detección de cambios y política de ramas.
2. Formato del repositorio, pruebas de la infraestructura CI, Conventional Commits y sintaxis de Actions/Compose.
3. Pipelines independientes de API, web, backoffice y móvil cuando tienen cambios.
4. Imágenes de producción y comprobaciones HTTP en una infraestructura Docker efímera cuando cambia una aplicación de servidor o su configuración.
5. `Pettly CI Quality Gate`: falla si falta un resultado obligatorio, hay fallos, cancelaciones o un job requerido fue omitido.
6. Resumen consolidado en GitHub Actions y, opcionalmente, Discord.

Los PR hacia `main` solo pueden proceder de `dev` del mismo repositorio.
No hay despliegues automáticos configurados todavía.

## Cambios y ejecución manual

Los cambios en `package.json`, el lockfile, Nx, TypeScript, configuración de lint/formato, bibliotecas compartidas, Actions y scripts de CI activan todas las aplicaciones. Los cambios exclusivos de Flutter no construyen contenedores. Un cambio en API, web o admin activa la comprobación Docker de las tres aplicaciones.

Cambiar solo documentación ejecuta los controles del repositorio y la validación final, omitiendo las compilaciones.

`Run workflow` permite forzar todas las aplicaciones con `force_all=true` (predeterminado). Con `false`, analiza el último commit de la rama. El workflow debe existir en la rama predeterminada para que GitHub muestre la ejecución manual.

## Aplicaciones Node

El workflow reutilizable `node-app.yml` conserva la secuencia de task-manager:

- Primero formato, lint y tipos.
- Después unitarias, integración y build de producción en paralelo.
- SonarCloud cuando se configura un proyecto.
- Validación final de la aplicación.

La preparación de pnpm/Node es una acción local compartida. Se usa pnpm fijado en `package.json` y el lockfile raíz. `HUSKY=0` desactiva hooks durante CI, sin desactivar los scripts nativos de dependencias.

Actualmente no hay suites de aplicación. Los jobs indican `not_configured`: no se presenta como pruebas ejecutadas. Al añadir un target Nx `test:unit` (o `test`) y `test:integration`, el workflow los ejecutará y cualquier fallo bloqueará la validación. Las pruebas unitarias preceden a SonarCloud; si producen un artefacto de cobertura en `apps/<aplicación>/coverage`, se reutiliza.

Los artefactos de compilación se conservan 7 días. El bundle standalone de Next.js incluye los recursos estáticos y `public`. Los artefactos de API y Angular corresponden a sus compilaciones; las imágenes Docker son la comprobación del empaquetado completo de producción.

## Flutter

Se valida formato Dart, `flutter analyze`, y la suite `test/*_test.dart` cuando exista. Se compila un APK Android de desarrollo sin credenciales de publicación y se conserva como artefacto. La compilación iOS de simulador sigue disponible localmente mediante `pnpm build:mobile:ios`.

Flutter permanece fuera de Docker.

## Docker aislado

`docker-compose.ci.yml` es un override específico de CI. Crea una red dedicada y un PostgreSQL temporal con credenciales exclusivas de prueba; no accede al `global_postgres` compartido del equipo. Los contenedores se eliminan junto a sus volúmenes y red al finalizar, incluso si una comprobación falla.

La prueba comprueba salud, respuesta de la API, HTML Next.js, carga de bundles Angular, fallback SPA y acceso de red al PostgreSQL temporal. **No es una suite E2E de negocio ni valida persistencia:** esas funciones todavía no existen.

Para reproducirla localmente en puertos distintos de los de desarrollo:

```sh
export CI_COMPOSE_PROJECT=pettly-ci-local
export CI_NETWORK_NAME=pettly-ci-local
export API_PORT=13100 WEB_PORT=13101 ADMIN_PORT=14300
pnpm docker:ci:up
node scripts/ci/smoke-docker.mjs
pnpm docker:ci:down
```

El Compose de desarrollo conserva su red externa compartida. CI utiliza cache de BuildKit y publica diagnósticos Docker cuando falla.

## Configuración externa opcional

El CI básico funciona sin secretos externos.

En GitHub → Settings → Secrets and variables → Actions:

| Tipo     | Nombre                    | Finalidad                                         |
| -------- | ------------------------- | ------------------------------------------------- |
| Variable | `SONAR_ORGANIZATION`      | Organización de SonarCloud                        |
| Variable | `SONAR_API_PROJECT_KEY`   | Activa SonarCloud de la API                       |
| Variable | `SONAR_WEB_PROJECT_KEY`   | Activa SonarCloud de la web                       |
| Variable | `SONAR_ADMIN_PROJECT_KEY` | Activa SonarCloud del backoffice                  |
| Secreto  | `SONAR_TOKEN`             | Token de análisis de esos proyectos               |
| Variable | `CI_DISCORD_ENABLED=true` | Activa un único reporte consolidado por ejecución |
| Secreto  | `DISCORD_WEBHOOK`         | Webhook del canal elegido                         |

SonarCloud requiere crear los proyectos, configurar su quality gate y desactivar el análisis automático si se usa este análisis CI. Un proyecto activado sin token falla de forma explícita. Las comprobaciones con secretos se omiten en PR desde forks. Discord solo se ejecuta en pushes y ejecuciones manuales, nunca en PR.

Para exigir los controles al integrar cambios, configura una regla de protección en `dev` y `main` que requiera el check **Pettly CI Quality Gate**. El nombre permanece estable aunque algunos módulos no cambien. La política de origen de PR complementa esa regla, pero no impide por sí sola pushes directos.

Los destinos de despliegue, entornos de aprobación y credenciales se configurarán cuando se elijan los servicios de Render/Vercel. No se han creado servicios ni publicado aplicaciones como parte de esta configuración.

## Validaciones de esta configuración

```sh
pnpm test:ci
pnpm format:check
pnpm docker:ci:config
docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:1.7.11 -color
```
