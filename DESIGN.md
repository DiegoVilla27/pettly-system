# Diseño de Pettly

Última actualización: 2026-10-09.

Este documento reúne las decisiones de arquitectura y producto acordadas para Pettly. Distingue lo implementado de lo planificado: una decisión descrita aquí no implica que ya exista en el código.

## Mantenimiento del documento

Actualizar este archivo en cada tarea que cambie el sistema, junto con el código correspondiente. Registrar cambios en módulos, modelos, endpoints, seguridad, infraestructura, integraciones y estrategia de pruebas. Actualizar los estados y las decisiones pendientes; no acumular propuestas abandonadas como si siguieran vigentes.

No incluir secretos, contraseñas, tokens ni valores privados de infraestructura. Mantener los detalles operativos en `docs/development.md` y `docs/ci.md`, enlazándolos desde aquí.

## Producto y alcance

Fuentes de negocio descargadas de la carpeta ANIMALES de Google Drive el 2026-10-08: `negocio.docx` y `tecnico.docx` en la raíz, con copias de lectura [NEGOCIO.md](NEGOCIO.md) y [TECNICO.md](TECNICO.md). Son versiones 2.0 propuestas para revisión; las decisiones aprobadas de esta sesión prevalecen sobre propuestas pendientes de las fuentes. Las copias son snapshots y deben actualizarse al cambiar las fuentes.

Pettly será una plataforma para clientes, empresas y refugios. Contempla catálogo y compras, servicios y reservas, gestión de animales y adopciones, y administración con permisos diferenciados.

El desarrollo será incremental. Primero se completarán recorridos funcionales, empezando por identidad y acceso. El alcance exacto del MVP comercial todavía debe definirse; los módulos previstos no constituyen un compromiso de implementar todo en la primera entrega.

Una persona podrá ser cliente y, al mismo tiempo, administrar una empresa o colaborar con un refugio. Los permisos dentro de una organización dependerán de su membresía. La cuenta tiene un rol global (`user`, `moderator` o `super_admin`) y puede tener varias membresías con roles distintos por organización. Todos conservan capacidades de cliente. Solo el superadministrador asigna, cambia o retira roles, incluidos los de administradores y operadores de empresa/refugio.

## Mercado y modelo de pagos aprobado

Pettly operará inicialmente solo en Colombia y los cobros serán exclusivamente en COP. El modelo aprobado es **split payments**: el proveedor de pagos gestionará el recaudo y el reparto entre la empresa vendedora y Pettly, que recibirá su comisión. Esta decisión sustituye la propuesta de ingresar todo el dinero en una cuenta de Pettly para transferirlo posteriormente a las empresas.

Proveedor recomendado: ePayco agregador con Smart Checkout y split, sujeto a activación y cotización. **Comisión inicial aprobada: 10%, configurable mediante `PETTLY_COMMISSION_PERCENT` en `.env`**, validada entre 0 y 100 con máximo dos decimales. Se aplica al subtotal de productos sin envío ni impuestos añadidos; si el precio incluye impuestos, forman parte de ese subtotal. Cada cotización/pedido conserva el porcentaje y reparto aceptados; cambiar la variable requiere reiniciar API y solo afecta nuevas cotizaciones. El vendedor asumirá los costes de procesamiento declarados; no se inventan tarifas, deducciones fiscales ni saldo neto bancario. Liberación tras entrega, reembolsos y liquidación dependen de condiciones confirmadas del proveedor.

**Estado técnico:** núcleo de Payments implementado con DDD hexagonal: intentos idempotentes, reparto inmutable, eventos normalizados verificados por un puerto de consulta, evidencia de captura, estado independiente de distribución, auditoría y outbox transaccional con leases/reintentos. Proveedor real deshabilitado: no se cobra, no hay URL de checkout simulada ni endpoint para marcar pagado. Adaptador ePayco, onboarding, webhooks y reembolsos externos pendientes. Scheduler de Payments en API; worker continúa con notificaciones.

Nuevo checkout limitado a Colombia/COP, comisión guardada antes del consentimiento y reservas de treinta minutos para preparar el flujo PSE. Los contratos históricos de Catalog/Orders conservan monedas genéricas y metadatos collector; Payments utiliza reparto explícito y rechaza pedidos históricos sin comisión aceptada. Snapshots/plazos anteriores no se cambian. Un pago tardío queda en conciliación con evidencia de captura, sin revivir el pedido ni consumir stock vencido. Detalles en [Payments](docs/payments.md) y [consulta preparada para ePayco](docs/payments-provider-onboarding.md).

## Arquitectura y tecnologías

| Componente    | Tecnología           | Responsabilidad                                                   | Estado                                                                    |
| ------------- | -------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `apps/api`    | NestJS + TypeScript  | Reglas de negocio, autenticación, autorización e integraciones    | Features de negocio implementadas; integración de pagos externa pendiente |
| `apps/web`    | Next.js + TypeScript | Experiencia del cliente, catálogo, compras, reservas y adopciones | Base implementada                                                         |
| `apps/admin`  | Angular + TypeScript | Backoffice de empresas, refugios y administración global          | Base implementada                                                         |
| `apps/mobile` | Flutter / Dart       | Aplicación móvil Android e iOS                                    | Base implementada                                                         |
| `apps/worker` | Node.js + BullMQ     | Correos, notificaciones y tareas asíncronas                       | Implementado                                                              |
| Base de datos | PostgreSQL + Prisma  | Persistencia, relaciones, restricciones y migraciones             | Implementado                                                              |
| Redis         | Redis                | Límites de tráfico, colas y caché                                 | Implementado                                                              |

El monorepo usa Nx y pnpm. Node y pnpm se fijan en la configuración del repositorio. Flutter tiene su propio gestor de dependencias; Nx coordina sus comandos.

Se mantendrá una API modular con una base PostgreSQL y un worker separado. Las aplicaciones consumirán la misma API. Las reglas y permisos se aplicarán en el backend. No se introducirán microservicios inicialmente; una separación futura deberá responder a necesidades reales.

Paquetes compartidos previstos:

- `packages/api-client`: cliente generado desde OpenAPI para consumidores TypeScript.
- `packages/config`: configuración compartida cuando sea necesaria.

Estos dos paquetes todavía no están implementados. `packages/notifications-runtime` contiene el contrato de correo, cifrado y runtime de notificaciones compartido con el worker. El mecanismo de generación del cliente Dart permanece pendiente.

## Arquitectura obligatoria de la API

**Requisito no negociable:** la API se implementará con arquitectura hexagonal, organizada por features/módulos y con Domain-Driven Design (DDD). Cada feature separará dominio, aplicación, adaptadores de entrada y adaptadores de salida. No se organizará toda la API en carpetas globales de controladores, servicios y repositorios.

Users, Auth, Authorization, Organizations, Animals, Media, Adoptions, Catalog, Inventory, Cart, Orders, Payments, Services, Bookings, Notifications y Veterinary implementan esta estructura. Los módulos NestJS conectan handlers puros con adaptadores HTTP y Prisma mediante puertos explícitos. Un control automatizado valida las dependencias de las capas.

### Capas y dirección de dependencias

| Capa              | Contenido y responsabilidad                                                                            | Dependencias permitidas                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| Domain            | Entidades, agregados, value objects, invariantes, servicios y eventos de dominio                       | Dominio propio y contratos de dominio explícitos; sin NestJS, Prisma, Redis, HTTP ni Swagger |
| Application       | Casos de uso, commands, queries, handlers, puertos y resultados de aplicación                          | Domain y abstracciones propias; sin adaptadores concretos ni DTO HTTP                        |
| Inbound adapters  | Controladores HTTP, DTO de request/response, validación de transporte, documentación Swagger y mappers | Application y contratos necesarios del dominio                                               |
| Outbound adapters | Repositorios Prisma, Redis, colas, SMTP y clientes externos; mappers de persistencia                   | Puertos de Application/Domain y tecnologías concretas                                        |
| Composition root  | Módulo NestJS y wiring de providers                                                                    | Todas las capas para conectar puertos con adaptadores                                        |

Las dependencias apuntarán hacia el interior. Domain y Application no importarán Infrastructure ni Presentation. El dominio y los casos de uso serán TypeScript independiente del framework; NestJS se usará en los adaptadores y en la composición. La inyección se realizará mediante puertos y tokens/providers explícitos en el composition root.

Los puertos se definirán en la capa que necesite la capacidad. Las abstracciones de persistencia utilizadas por casos de uso pertenecerán a Application; una abstracción exigida directamente por una regla de dominio podrá pertenecer a Domain. Los adaptadores implementarán esos contratos sin imponer modelos tecnológicos al núcleo.

### Organización por feature

Estructura orientativa; los directorios se crearán cuando exista una responsabilidad real, sin archivos vacíos ni interfaces decorativas:

```text
apps/api/src/
  main.ts
  app.module.ts
  modules/
    users/
      domain/
        aggregates/
        entities/
        value-objects/
        services/
        events/
        errors/
      application/
        ports/
          in/
          out/
        commands/
        queries/
        handlers/
        results/
      adapters/
        in/
          http/
            controllers/
            dtos/
              requests/
              responses/
            mappers/
        out/
          persistence/
            prisma/
              repositories/
              mappers/
      users.module.ts
    auth/
      domain/
      application/
      adapters/
        in/http/
        out/persistence/
        out/security/
      auth.module.ts
  shared/
    domain/
    application/
    infrastructure/
```

Cada feature será propietaria de sus contratos y comportamiento. `shared` contendrá únicamente capacidades transversales justificadas, como composición de conexiones, transacciones, manejo de errores HTTP y observabilidad. No se convertirá en un repositorio global de lógica de negocio.

### DDD y límites entre módulos

- Definir el lenguaje del negocio y los límites de cada contexto antes de implementar sus modelos. Un módulo NestJS no equivale automáticamente a un bounded context ni cada tabla a un agregado.
- Identificar agregados y sus límites de consistencia; sus métodos protegerán las invariantes. Usar value objects para conceptos con validación o semántica propia, como un email normalizado.
- Mantener reglas de negocio en el dominio. Los casos de uso coordinarán el dominio, los puertos, las transacciones y los efectos externos.
- Los módulos colaborarán mediante puertos públicos, contratos de aplicación o eventos explícitos. No accederán directamente a repositorios internos, tablas ni adaptadores de otro módulo.
- Users será propietario de identidad y perfil; Auth de credenciales, sesiones y flujos de autenticación. El hash de contraseña reside en `auth_credentials`, propiedad de Auth; el contrato público de Users no lo contiene.
- Persistir los eventos que desencadenen trabajos externos mediante outbox dentro de la transacción del caso de uso. El procesamiento posterior preservará idempotencia y seguimiento de fallos.

### Commands, queries, puertos y mappers

Las operaciones de escritura tendrán commands y handlers/casos de uso explícitos; las lecturas tendrán queries y sus handlers. Se aplicará separación de lectura y escritura en el código, sin exigir bases separadas ni event sourcing. La elección de un bus CQRS se evaluará durante la implementación; no debe introducir dependencias de NestJS en el núcleo.

Ejemplo de recorrido:

```text
HTTP request
  → request DTO + validación de transporte
  → HTTP mapper
  → command/query + puerto de entrada
  → handler/caso de uso
  → dominio + puertos de salida
  → adaptadores Prisma/Redis/SMTP/colas
  → resultado de aplicación
  → response mapper + response DTO
  → HTTP response
```

Los DTO de request y response serán distintos y pertenecerán al adaptador HTTP. Se implementan con esquemas Zod estrictos, validación de entrada global y validación de salida antes de responder; Swagger se genera desde esos mismos contratos. Zod no se importa en Domain ni Application. Los commands, queries y resultados de aplicación serán contratos independientes del transporte. Los mappers HTTP convertirán entre esos contratos; los mappers de persistencia convertirán entre los modelos Prisma y los modelos del dominio. Ningún controlador devolverá directamente entidades de dominio ni registros Prisma.

Los puertos de salida cubrirán las capacidades necesarias: repositorios, transacciones, hashing, emisión/validación de tokens, generación aleatoria, reloj, límites de solicitudes y publicación de trabajos, según el caso de uso. Se crearán contratos específicos, evitando un repositorio CRUD genérico que eluda las invariantes de los agregados.

### Validación, errores y transacciones

Los DTO validarán el formato de entrada; el dominio protegerá sus invariantes independientemente de HTTP. Los errores de dominio y aplicación serán explícitos y se traducirán a respuestas HTTP en un adaptador común, con códigos estables y sin filtrar detalles internos.

Las transacciones tendrán límites definidos por el caso de uso. Los handlers no recibirán clientes Prisma ni tipos de transacción Prisma: utilizarán un puerto de unidad de trabajo o equivalente. Las garantías de unicidad, consumo de tokens, rotación de sesiones y escritura de outbox se comprobarán también bajo concurrencia.

### OpenAPI / Swagger en inglés

**Requisito obligatorio:** toda la documentación pública de la API estará en inglés y se mantendrá con OpenAPI/Swagger. Los nombres de contratos y los textos de summaries, descriptions, propiedades, ejemplos y errores documentados estarán en inglés.

Cada endpoint deberá documentar:

- Feature/tag, `operationId` estable, resumen y descripción del comportamiento.
- Path/query parameters, headers y cookies relevantes, y DTO de request con ejemplos y restricciones.
- DTO de response para cada resultado, status codes y formato común de errores.
- Esquema de autenticación, requisitos de autorización y condiciones de verificación del email cuando correspondan.
- Paginación y filtros si aplica; límites de solicitudes y respuestas `429` donde existan.
- Semántica de efectos relevantes: rotación, revocación, idempotencia y respuestas uniformes para evitar enumeración.

La especificación OpenAPI deberá poder generarse y validarse en CI. La documentación Swagger se ubicará en los adaptadores HTTP; no habrá decoradores Swagger en Domain ni Application. Swagger se expone en `/api/docs` y JSON en `/api/openapi.json`. En producción requiere activación explícita con `SWAGGER_ENABLED=true`. `pnpm docs:api` genera y comprueba el contrato sin conectarse a servicios externos; CI conserva el artefacto. El contrato generado será la base del cliente TypeScript compartido, evitando mantener definiciones incompatibles manualmente.

### Verificación de la arquitectura

Se han establecido reglas automatizadas de imports/dependencias para impedir cruces de capas y acceso a implementaciones internas de otros módulos. Las pruebas se organizarán por responsabilidad:

- Domain: invariantes, value objects y comportamiento de agregados.
- Application: casos de uso mediante puertos sustituidos por dobles de prueba.
- Outbound adapters: integración real con PostgreSQL/Redis y comportamiento transaccional.
- Inbound adapters: contratos HTTP, validación, autenticación y documentación OpenAPI.
- Recorridos completos: registro, verificación, login, renovación, revocación y recuperación, incluyendo fallos y concurrencia relevantes.

La arquitectura debe permitir probar el núcleo sin servidor HTTP ni infraestructura externa, sustituir adaptadores sin reescribir reglas de negocio y hacer explícitas las dependencias de cada caso de uso.

## Infraestructura de desarrollo

La API utilizará el servidor PostgreSQL que ya existe en la red Docker externa `shared-network`, accesible como `global_postgres`. Se ha creado allí una base propia llamada `pettly_db`, sin levantar otro servidor PostgreSQL para desarrollo ni modificar las bases de otros proyectos.

La configuración de conexión se proporcionará mediante variables de entorno. La base y las migraciones de Users/Auth están creadas. El usuario dedicado `pettly_dev` es propietario de la base de Pettly y no tiene privilegios de superusuario. Prisma utiliza `DATABASE_URL`; Docker utiliza `DATABASE_URL_DOCKER`. Los secretos se mantienen únicamente en `.env`, ignorado por Git.

Se utiliza el Redis compartido `global_redis` para límites distribuidos y BullMQ, con conexión verificada. Las claves y colas tendrán prefijos propios de proyecto y entorno, por ejemplo `pettly:dev:`. No se modificarán ni borrarán claves de otros proyectos ni se ejecutarán limpiezas globales del servidor compartido.

API, web y backoffice están dockerizados; Flutter permanece fuera de Docker. Los puertos Docker predeterminados son API `3100`, web `3101` y backoffice `4300`. El desarrollo directo usa API `3000`, web `3001` y Angular `4200`.

Mailpit está integrado en Compose: SMTP interno `mailpit:1025` y bandeja local `http://localhost:8025`. El envío se configurará por SMTP para permitir elegir posteriormente un proveedor de producción.

## Módulos de la API

| Módulo                 | Responsabilidad                                                       |
| ---------------------- | --------------------------------------------------------------------- |
| Users                  | Identidad, perfil y estado de la cuenta                               |
| Auth                   | Registro, acceso, sesiones, recuperación y verificación de email      |
| Organizations          | Empresas, refugios, miembros y permisos de cada organización          |
| Animals                | Fichas, fotos, características y relación con propietarios o refugios |
| Media                  | Validación, recodificación y almacenamiento privado de imágenes       |
| Adoptions              | Publicaciones, solicitudes y seguimiento                              |
| Catalog e Inventory    | Productos, variantes, precios y existencias                           |
| Orders                 | Compras, artículos, estados y entregas                                |
| Payments               | Cobros, conciliación y reembolsos                                     |
| Services y Bookings    | Servicios, horarios, recursos, disponibilidad y reservas              |
| Notifications          | Correos, avisos, push y recordatorios                                 |
| Administration y Audit | Moderación y registro de acciones relevantes                          |

Users, Auth y Authorization están implementados. Organizations implementa perfiles, onboarding/revisión, aprobación, suspensión, responsables, membresías y auditoría; Animals, Media y Adoptions añaden fichas, fotos privadas, publicaciones moderadas, solicitudes con consentimiento y confirmación explícita de adopción; Catalog e Inventory incorporan productos, variantes y existencias; Cart y Orders incorporan cotización, consentimiento, reservas vinculadas y entregas; Payments implementa el núcleo financiero; la integración ePayco es la siguiente conexión externa. Services y Bookings implementan servicios moderados, recursos/calendarios, citas y alojamiento por noches, capacidad/bloqueos, reservas con políticas aceptadas, reprogramación, estados y vencimiento. Notifications incorpora bandeja persistente propia, preferencias de correo opcional, avisos de pedidos/adopciones/organizaciones/reservas, recordatorios 24h/1h y reintentos auditados de entrega para superadmin sobre outbox, worker y SMTP; Veterinary añade acreditación privada y revisión humana independiente, vigencia operativa/revocación y bloqueo de publicación/nuevas citas clínicas. El prepago online de reservas y las demás extensiones siguen pendientes. `GET /api` conserva la respuesta inicial de estado.

La primera entrega funcional será Users + Auth. Organizations ya establece la pertenencia y los permisos de empresas y refugios; su onboarding y gestión administrativa están implementados. El orden de los módulos restantes dependerá de los recorridos elegidos para el MVP.

## Identidad y acceso implementados

Regla obligatoria para todos los módulos: usar identificadores UUID para las entidades, nunca IDs numéricos autoincrementales. Actualmente se generan UUID v4 con `crypto.randomUUID()` y PostgreSQL los almacena como `uuid`. Credenciales reutilizan el UUID del usuario; tokens usan su hash SHA-256 como clave técnica. Los identificadores no sustituyen los controles de autorización sobre cada recurso.

Users es propietario de identidad, perfil ampliado, rol administrativo global y auditoría de su administración; Auth de credenciales, sesiones, tokens, invitaciones y coordinación de cambios sensibles. Ambos usan arquitectura hexagonal y DDD, con agregados, value objects, puertos, commands/queries, handlers, mappers y DTO HTTP separados.

El registro crea un usuario no verificado y un correo duradero en una sola transacción. La verificación es obligatoria para iniciar sesión. Se usa Argon2id y JWT HS256 de 15 minutos, con issuer/audience restringidos. El refresh token es aleatorio de 256 bits, se almacena como hash SHA-256 y rota en cada renovación. La sesión tiene duración absoluta de 30 días; reutilizar un token consumido revoca su sesión. Los JWT comprueban la sesión y el estado del usuario en PostgreSQL para revocación inmediata.

El CRUD administrativo permite invitaciones por correo, consulta, búsqueda, filtros, paginación, edición con motivo y auditoría, y eliminación con anonimización. Las cuentas nuevas siguen iniciando como user; ningún administrador elige su contraseña. Auth añade cambio de contraseña autenticado, cambio de email con verificación de la nueva dirección, listado/revocación de sesiones y eliminación propia con contraseña. Las transacciones compartidas preservan atomicidad entre perfil, credenciales, revocación, outbox y auditoría. La eliminación conserva UUID y referencias históricas, limpia datos personales/credenciales y no permite reactivar la cuenta; protege al último superadministrador activo incluso bajo concurrencia. Índices pg_trgm apoyan búsquedas de texto.

**OTP por SMS en pausa por decisión explícita del usuario (2026-10-08):** no hay endpoints OTP, códigos de respaldo ni obligación MFA en esta entrega. Proveedor y configuración pendientes. La pausa no bloquea el resto de Users/Auth.

La recuperación y verificación usan tokens de un solo uso con propósito, expiración e invalidación de anteriores. Reset revoca todas las sesiones. Forgot-password y resend-verification ofrecen respuestas uniformes. Las garantías concurrentes se apoyan en transacciones, locks PostgreSQL por usuario/email y restricciones e índices de la base.

Web usa refresh en cookie HttpOnly, SameSite=Lax, Secure en producción, Origin permitido y `X-CSRF-Protection: 1`. Mobile recibe refresh en JSON para su futura integración con almacenamiento seguro. La integración de las interfaces todavía está pendiente.

Los correos se escriben cifrados en una outbox PostgreSQL dentro de la transacción; el worker publica identificadores en BullMQ y envía por SMTP. Los payloads se eliminan tras envío, cancelación o expiración. Redis limita tráfico por IP y cuenta; una dependencia no disponible devuelve un error seguro `503`. SMTP tiene reintentos y deduplicación por job, sin prometer entrega exactamente una vez.

Documentación específica que debe actualizarse con cada cambio:

- [Users](docs/users.md): identidad, perfil, invariantes y endpoints.
- [Auth](docs/auth.md): autenticación, sesiones, seguridad y contratos.
- [Authorization](docs/authorization.md): roles aprobados, matriz de permisos y consultas de acceso.
- [Organizations](docs/organizations.md): perfiles, onboarding, revisión, estado operativo, responsables, membresías y auditoría de organizaciones.
- [Animals](docs/animals.md): fichas privadas y pertenencia, estados, fotos y auditoría.
- [Media](docs/media.md): procesamiento y almacenamiento privado de imágenes con límites.
- [Catalog](docs/catalog.md): categorías, productos, variantes, precios y publicaciones revisadas.
- [Inventory](docs/inventory.md): existencias, movimientos idempotentes y reservas duraderas.
- [Cart](docs/cart.md): selección persistente propia, una empresa/moneda y versiones.
- [Orders](docs/orders.md): política comercial, cotizaciones, consentimiento, reservas, estados y auditoría.
- [Payments](docs/payments.md): núcleo de pagos, comisión configurable, reparto, outbox, conciliación y conexión externa pendiente.
- [Adoptions](docs/adoptions.md): publicaciones revisadas, solicitudes con consentimiento y adopción confirmada.
- [Services](docs/services.md): catálogo moderado, recursos compartidos, calendarios y disponibilidad.
- [Bookings](docs/bookings.md): reservas propias, políticas aceptadas, concurrencia, reprogramación y vencimientos.
- [Notifications](docs/notifications.md): bandeja propia, preferencias, eventos de negocio, outbox/BullMQ/SMTP, recordatorios y recuperación auditada.

## Redis en el sistema completo

Redis será una infraestructura compartida por los módulos, con responsabilidades delimitadas. PostgreSQL seguirá siendo la fuente de verdad del negocio.

| Área                         | Uso previsto de Redis                                       | Objetivo                                                                           |
| ---------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Auth y seguridad             | Contadores con vencimiento por IP y cuenta                  | Limitar solicitudes, intentos de acceso y reenvíos entre varias instancias         |
| Catálogo y adopciones        | Caché de fichas públicas, categorías y consultas frecuentes | Reducir lecturas repetidas y acelerar navegación                                   |
| Servicios y reservas         | Caché breve de horarios y disponibilidad mostrada           | Acelerar consultas; confirmar disponibilidad en PostgreSQL al reservar             |
| Notificaciones               | Colas BullMQ para correos, push y recordatorios             | Procesar fuera de la petición y reintentar fallos                                  |
| Pedidos y pagos              | Colas para eventos, conciliación y vencimientos             | Procesar trabajo asíncrono sin bloquear al cliente                                 |
| Backoffice                   | Caché de estadísticas y resúmenes costosos                  | Evitar recalcular informes en cada visita                                          |
| Tiempo real, si se incorpora | Distribución de eventos entre instancias                    | Entregar avisos, cambios de estado o mensajes a conexiones en distintos servidores |

Reglas de diseño:

- Cada caché tendrá vencimiento e invalidación definidos. Los datos cacheados deberán poder reconstruirse.
- Las claves incluirán proyecto, entorno y organización cuando corresponda, evitando mezclar datos entre organizaciones.
- Reservas, inventario, pedidos y pagos se garantizarán mediante transacciones y restricciones en PostgreSQL. Redis no será la única garantía de consistencia.
- El estado de idempotencia de operaciones críticas se guardará de forma duradera. Reprocesar un trabajo no deberá duplicar sus efectos de negocio.
- Los trabajos importantes se originarán en una outbox de PostgreSQL, escrita en la misma transacción que la operación. Un proceso los publicará en la cola y permitirá recuperarlos si Redis no está disponible.
- Los envíos usarán reintentos y seguimiento de fallos. Los efectos externos, como enviar un correo, requieren una estrategia de deduplicación acorde al proveedor; no se asumirá entrega exactamente una vez.
- En producción se plantea separar Redis de caché y Redis de colas, según carga y presupuesto. La caché puede expulsar entradas; las colas necesitan configuración de memoria, persistencia y recuperación apropiada para trabajos pendientes.

Desde Users + Auth se introducirán límites de tráfico, correos asíncronos y outbox. Las cachés de negocio se incorporarán al desarrollar sus módulos y medir las consultas que lo justifiquen. No se cacheará todo indiscriminadamente.

## Rendimiento y fiabilidad

El rendimiento se abordará con consultas eficientes, índices, paginación, transacciones acotadas y medición antes de añadir complejidad. Redis complementará estas medidas.

El worker se ejecutará separado de la API para desacoplar tiempos de respuesta y procesamiento. Se definirán reintentos, vencimientos y comportamiento ante fallos para cada operación. Los logs y métricas deberán permitir diagnosticar API, base de datos y colas sin exponer credenciales ni tokens.

Las decisiones todavía pendientes incluyen el proveedor SMTP de producción, los destinos de despliegue, los dominios de clientes/API, la estrategia de archivos e imágenes y los límites concretos de tráfico y concurrencia.

## Git, hooks y CI

Husky y CI están implementados. Se usa Conventional Commits y se trabaja en ramas de tarea basadas en `dev`. Los PR hacia `main` deben proceder de `dev` del mismo repositorio. La protección efectiva de ramas requiere reglas de GitHub.

Los hooks validan el mensaje de commit, revisan archivos preparados y construyen/levantan los contenedores antes del push. Detalles: [desarrollo](docs/development.md).

GitHub Actions mantiene un orquestador y workflows reutilizables. Detecta cambios, realiza controles del repositorio y activa las aplicaciones afectadas. Las aplicaciones Node ejecutan controles estáticos primero; después, pruebas disponibles y build, con SonarCloud opcional. Flutter valida Dart y genera un APK Android. Docker comprueba imágenes de producción y respuestas HTTP con PostgreSQL temporal aislado.

El quality gate final falla ante controles requeridos fallidos, cancelados o ausentes. Users/Auth tienen pruebas unitarias e integración real de API, PostgreSQL, Redis y Mailpit, incluyendo concurrencia, revocación y contratos. Las aplicaciones sin suite siguen mostrando `not_configured`. CI comprueba arquitectura y exporta OpenAPI.

Se usan cachés de pnpm/Flutter, caché Gradle y cachés BuildKit separadas por aplicación. Documentación y archivos de CI se excluyen del contexto Docker para conservar las capas de compilación. Las ejecuciones obsoletas se cancelan.

CI no utilizará los PostgreSQL/Redis compartidos de desarrollo: las pruebas que los necesiten tendrán infraestructura temporal aislada. Las pruebas utilizan PostgreSQL, Redis y Mailpit temporales y los eliminan al finalizar.

SonarCloud y Discord son opcionales y requieren configuración externa. No hay despliegue automático configurado. Detalles: [CI](docs/ci.md).

## Próxima entrega y estado

Entrega actual: Users + Auth, persistencia, seguridad, correos y pruebas. Authorization y Organizations permiten los siete roles aprobados y el alta, revisión y gestión de empresas/refugios; Animals + Media + Adoptions implementan el recorrido de adopción; Cart + Orders completan carrito, cotización y pedidos; siguiente integración: ePayco sobre el núcleo de Payments. Las interfaces cliente y backoffice todavía no consumen Auth.

| Elemento                                                          | Estado actual                                                  |
| ----------------------------------------------------------------- | -------------------------------------------------------------- |
| Monorepo Nx + pnpm y bases de las cuatro aplicaciones             | Implementado                                                   |
| Docker de API/web/admin, Husky y CI                               | Implementado                                                   |
| Creación de `pettly_db` y migraciones Prisma                      | Implementado                                                   |
| Users/Auth: CRUD administrativo y seguridad de cuentas, salvo OTP | Implementado                                                   |
| OTP por SMS y códigos de respaldo                                 | En pausa por decisión del usuario                              |
| Redis para límites de tráfico                                     | Implementado                                                   |
| Worker, BullMQ, outbox y correo local                             | Implementado                                                   |
| Pruebas de negocio e integración de autenticación                 | Implementado                                                   |
| Authorization y gestión de Organizations                          | Implementado                                                   |
| Animals, Media y Adoptions                                        | Implementado                                                   |
| Catalog e Inventory                                               | Implementado                                                   |
| Cart, cotizaciones y Orders                                       | Implementado; pagos reales pendientes                          |
| Payments                                                          | Núcleo implementado; pasarela y reembolsos externos pendientes |
| Services y Bookings                                               | Implementado; cobro en establecimiento, prepago pendiente      |
| Demás módulos                                                     | Planificado                                                    |

## Registro de decisiones

- **2026-10-08:** Descargadas y leídas las fuentes de negocio/técnica de Drive. Propuesta inicial de autorización en [docs/authorization.md](docs/authorization.md), posteriormente aprobada e implementada según el registro posterior: cliente (`user`), `super_admin`, `moderator`, `business_admin`, `business_operator`, `adoption_admin` y `adoption_operator`; soporte independiente opcional. Los roles de empresa y adopción corresponden a membresías de organización, con permisos por acción/recurso y verificación de pertenencia. El registro posterior recoge su aprobación e implementación.

- **2026-10-08:** Arquitectura hexagonal por features/módulos y DDD establecidos como requisitos no negociables. Se definen capas, puertos de entrada/salida, commands/queries, handlers, DTO separados de request/response, mappers y composición de adaptadores. Documentación OpenAPI/Swagger obligatoria en inglés y verificación automatizada de los límites de arquitectura.

- **2026-10-08:** Consolidación inicial del diseño acordado. Se mantienen la API modular, PostgreSQL compartido para desarrollo, JWT con sesiones duraderas y refresh tokens rotatorios, verificación obligatoria de email, recuperación de contraseña y Redis para límites, colas y cachés. El orquestador de CI se conserva por decisión del usuario, con optimizaciones de rendimiento y coste.

- **2026-10-08:** Implementados Users/Auth hexagonales y su documentación por módulo en `docs/`. PostgreSQL dedicado en shared-network, Prisma con restricciones, Argon2id, JWT y rotación con detección de reutilización, Redis para límites, outbox cifrada y worker SMTP/BullMQ. Pruebas temporales aisladas y OpenAPI exportable en CI. Leer este diseño y la documentación del módulo antes de cada tarea.

- **2026-10-08:** Perfil ampliado con `name` (nombres), `lastName` (apellidos), fecha de nacimiento y edad calculada en UTC, teléfono E.164 y dirección opcional (dirección, complemento, país ISO alpha-2, región, ciudad y código postal). Registro exige apellido para cuentas nuevas; la migración preserva nombres anteriores y deja apellido desconocido en null. Request/response DTO de toda la API actual migrados a Zod; campos desconocidos rechazados y errores seguros por campo.
- **2026-10-08:** `PATCH /api/users/{userId}/status` exige cuenta activa y verificada con rol global `super_admin`, comprobado en PostgreSQL. Motivo obligatorio, auditoría append-only y revocación de sesiones al deshabilitar en una sola transacción. No se puede deshabilitar al último superadministrador activo. La reactivación exige login nuevo. Primer superadministrador provisionado mediante CLI de operador, solo una vez y sobre cuenta ya verificada; ningún endpoint público asigna roles. Más detalles en `docs/users.md`.

- **2026-10-08:** Aprobados e implementados siete roles: `user`, `moderator`, `super_admin` globales; `business_admin`, `business_operator`, `adoption_admin`, `adoption_operator` por membresía de organización. Registro siempre como user sin membresías. Asignación/cambio/retirada exclusiva del superadministrador; administradores de empresas/refugios no asignan roles. Primera cuenta superadmin conserva bootstrap de operador solo una vez.
- **2026-10-08:** Authorization publica catálogo y acceso propio/consulta administrativa por puertos explícitos; Organizations crea identidades business/adoption_entity, membresías únicas por usuario/organización y auditoría append-only. Roles compatibles con el tipo de organización protegidos por dominio, Zod y PostgreSQL. Cambios de rol global revocan sesiones; membresías se consultan en la base en cada operación y conservan sesiones. Protección concurrente del último superadministrador ante degradación y suspensión. Permisos de módulos futuros quedan definidos como capacidades, sin afirmar que sus endpoints ya existan. Ver [Authorization](docs/authorization.md), [Organizations](docs/organizations.md) y [Users](docs/users.md).

- **2026-10-08:** Completado CRUD de usuarios por invitación, filtros/paginación, edición auditada, lectura de auditoría y eliminación irreversible por anonimización. Auth añade aceptación de invitaciones, cambio de contraseña y correo verificado, gestión de sesiones y eliminación propia. Migración `202610080005_users_management_security`: deletedAt, pendingEmail, propósitos y auditoría ampliados, restricciones de anonimización e índices de búsqueda/consulta. OTP/SMS pausado expresamente; ningún requisito MFA se aplica todavía.

- **2026-10-08, validación de esta entrega:** 14 pruebas unitarias y 25 pruebas de integración aislada aprobadas; lint, tipos, build, arquitectura y OpenAPI aprobados (35 operaciones). Migración 202610080005 aplicada a pettly_db, imagen API/worker reconstruida y Swagger local comprobado. Pruebas sin modificaciones de usuarios reales ni de otras bases/Redis compartidos.

- **2026-10-08:** Organizations incorpora perfiles legales/contacto, altas propias sin roles automáticos, revisión/rechazo/reenvío, aprobación explícita con responsable activo/verificado, suspensión/reactivación, transferencia de responsable, archivo terminal, listas/búsquedas, miembros y auditoría paginada. UUIDs, versiones optimistas, transacciones con auditoría y restricciones PostgreSQL. Solo organizaciones activas habilitan permisos operativos; cambios legales en activas/suspendidas requieren nueva aprobación. Únicamente superadmin asigna roles. Identidades anteriores migran a borrador. La aprobación no certifica licencias ni documentos; archivos/verificación documental y notificaciones de onboarding no se implementan en esta entrega. Ver [Organizations](docs/organizations.md).

- **2026-10-08:** Validación de Organizations: 19 pruebas unitarias, 27 escenarios de integración HTTP contra servicios aislados, lint/tipos/build de API y worker, límites hexagonales y OpenAPI (48 operaciones, 17 de Organizations). Migración 006 aplicada a pettly_db de shared-network; API local saludable y worker actualizado. Swagger disponible en http://localhost:3100/api/docs.

- **2026-10-08:** Animals, Media y Adoptions incorporan fichas personales/de refugio, fotos saneadas, snapshots públicos moderados, solicitudes con consentimiento explícito y condiciones aceptadas, decisiones y confirmación de entrega. Estados/versiones/UUID, permisos actuales por recurso, moderación ajena a la entidad, una selección/adopción por publicación y auditoría transaccional. Se confirma la adopción sin pagos; la relación de refugio del animal se conserva como historial, sin transferencia automática a mascotas personales. Almacenamiento inicial de JPEG saneado limitado en PostgreSQL bytea por un puerto sustituible, con costes de tamaño/backup explícitos en Media; object storage/CDN y notificaciones específicas pendientes. Catálogo público con elegibilidad por puertos y consultas por lotes, sin caché de permisos. Ver documentación de los tres módulos.

- **2026-10-08, validación de Animals/Media/Adoptions:** 25 pruebas unitarias y 34 escenarios HTTP aislados aprobados (35 resultados con la suite), lint/tipos/build de API y worker, límites de arquitectura y OpenAPI (78 operaciones, 30 nuevas). Imagen Docker construida y comprobado su codec de imágenes. Migración 007 aplicada únicamente en pettly_db de shared-network: siete tablas, cuatro guards/triggers y tres índices únicos de concurrencia comprobados. API saludable, worker actualizado, Swagger local accesible y rutas públicas/privadas verificadas sin crear datos reales. Cada solicitud exige la versión pública leída y conserva las condiciones aceptadas; condiciones cambiadas requieren renovar consentimiento antes de aprobar o confirmar la entrega.

- **2026-10-08:** Catalog e Inventory implementan taxonomía plana administrada por superadmin, productos de empresas activas, variantes con SKU único por empresa, precios enteros en unidades mínimas COP/USD/EUR y fotos saneadas. Publicación con revisión global ajena a la empresa y nueva revisión tras cambios. Inventario por variante con saldo físico/reservado, ledger inmutable/idempotente y reservas operativas de máximo treinta minutos; vencimiento persistido, scheduler recuperable en API y procesamiento por lotes. PostgreSQL respalda saldos, continuidad del ledger, reservas y auditoría transaccional. Disponibilidad pública se agrega desde reservas no vencidas; no supone carrito/pedido/pago. Consultas públicas no-store y permisos/visibilidad actuales; caché adicional de Redis pendiente de medición. Próximo recorrido comercial: Cart, Orders y Payments con snapshots de precios y políticas de envío/impuestos explícitas.

- **2026-10-08, validación de Catalog/Inventory:** 32 pruebas unitarias y 40 escenarios HTTP aislados aprobados (41 resultados con la suite), lint/tipos/build de API y worker, límites hexagonales y OpenAPI (110 operaciones: 24 Catalog, 8 Inventory). Disponibilidad en una sola consulta consistente; expiración por lotes probada con múltiples reservas. Ledger y reserva respaldados por PostgreSQL, incluido impedir borrar/reiniciar un saldo cero con historial y consumos fuera de plazo. Migración 008 aplicada solo en pettly_db de shared-network, ocho tablas y diez guards/constraint triggers comprobados; imagen construida, API saludable, worker actualizado y Swagger/rutas públicas/privadas verificados sin crear productos o movimientos reales.

- **2026-10-09:** Implementados Cart y Orders con arquitectura hexagonal por features. Carrito persistente propio, una empresa/moneda, máximo cincuenta variantes y cantidades 1–99; no reserva stock al añadir. La empresa configura explícitamente recogida y/o envíos por país/ciudad con tarifa fija, impuestos incluidos o adicionales con tasas explícitas, destinatario del futuro cobro y condiciones. No se habilitan tarifas, impuestos ni cobros reales por defecto. Cotización inmutable de cinco minutos; confirmación exige consentimiento y total exacto, versiones vigentes y elegibilidad actual. Una transacción crea pedido/snapshots, reserva todas las líneas, vacía carrito y audita; idempotencia duradera por comprador. Reservas de pedido no consumibles manualmente. Pedidos sin pagar vencen en quince minutos, liberan stock y se recuperan mediante scheduler/lectura. Puerto interno de pago verificado consume stock, con importe/moneda exactos y replay sin duplicados; no existe endpoint público para marcar pagado. Entrega solo después de pago, con estados/versión y auditoría. Payments/proveedor, reembolsos, conciliación externa, notificaciones comerciales, facturas y reglas de retención siguen pendientes; OTP continúa en pausa. Ver documentación de ambos módulos.

- **2026-10-09, validación de Cart/Orders:** 38 pruebas unitarias y 48 escenarios HTTP/puertos internos aislados aprobados (49 resultados con la suite), lint/tipos/build de API y worker, arquitectura hexagonal, formato y OpenAPI (125 operaciones: cuatro Cart y once Orders). Probados replay concurrente, auditoría fallida en creación/pago con rollback de stock/carrito, cambios de precio/condiciones, límites de rol, cancelación con empresa suspendida, expiración recuperable y entrega tras confirmación interna verificada. Migración 009 aplicada solo en pettly_db de shared-network: seis tablas, catorce guards/triggers y cinco índices críticos comprobados. API saludable, worker actualizado y Swagger/rutas locales verificados con lecturas; sin políticas comerciales habilitadas ni pedidos reales creados.

- **2026-10-09:** Aprobados Colombia como mercado inicial, COP como única moneda comercial y split payments gestionado por el proveedor. Pettly recibe su comisión y la empresa su parte mediante la distribución del proveedor. Esta decisión reemplaza la propuesta de recaudar todo en una cuenta de Pettly y dispersar después. Proveedor, porcentaje/base de comisión, costes, impuestos, reembolsos y liquidación pendientes. Registrado el diseño específico en docs/payments.md; todavía sin implementación de Payments ni restricción monetaria aplicada al runtime.

- **2026-10-09:** Implementado núcleo Payments: comisión inicial 10% en PETTLY_COMMISSION_PERCENT, snapshot por cotización/pedido, base subtotal sin envío/impuestos añadidos (incluye impuestos embebidos), redondeo BigInt y reparto exacto; intentos propios idempotentes, autorización financiera por empresa/plataforma, eventos/captura/auditoría inmutables y outbox PostgreSQL recuperable. Siete endpoints Zod/Swagger inglés; proveedor deshabilitado, sin cobros/reembolsos externos ni webhook inseguro. Consultas de pasarela fuera de transacciones y recuperación por identidad tras timeout; pagos tardíos o incongruentes en conciliación sin revivir stock. Nuevas compras Colombia/COP, reservas treinta minutos y snapshots antiguos preservados. Migración 010 y verificación descritas en docs/payments.md.

- **2026-10-09, validación de Payments:** 49 pruebas unitarias y 52 escenarios de integración aislados aprobados (53 resultados con la suite). Probados intentos concurrentes, rollback de outbox/captura con pedido y stock, eventos repetidos, comisión inmutable, distribución separada, timeout ambiguo, discrepancias y aprobación tardía. Lint/tipos/build API-worker, Prisma, arquitectura y formato aprobados; Swagger 132 operaciones, siete nuevas de Payments.

- **2026-10-09, despliegue local de Payments:** imagen Docker construida, migración 010 aplicada exclusivamente en pettly_db de shared-network; cinco tablas y nueve triggers de pago/cotización verificados. API y worker saludables; Swagger 200 con siete operaciones Payments y acceso anónimo a política rechazado con 401. Comisión local configurada en 10; intentos/eventos/capturas reales siguen en cero. Proveedor continúa deshabilitado.

- **2026-10-09:** Implementados Services y Bookings por features hexagonales/DDD, Zod request/response, mappers, puertos públicos y Swagger en inglés. Colombia/COP, citas por cuartos de hora con buffers y alojamiento por noches con calendario America/Bogota; recursos compartidos con capacidad 1–100, bloqueos y revisión global ajena a empresa/creador. Reserva de una mascota personal propia, consentimiento explícito de precio/condiciones/contacto mínimo, snapshot inmutable y replay idempotente; confirmación automática/manual con vencimiento persistido, reprogramación atómica, cancelación bajo política aceptada, atención/finalización/inasistencia y auditoría por revisión. PostgreSQL respalda asignación concurrente, compatibilidad de mascota, calendarios, ownership/versión/proyecciones y evidencia. Cobro inicial de reservas en establecimiento, explícito y separado de Orders/Payments: no prepago ni comisión/cobro simulado. Veterinary pendiente de validación profesional adicional. Notificaciones mínimas de reservas y recordatorios futuros 24h/1h, outbox cifrado con notBefore/deduplicación y cancelación de versiones obsoletas; worker sin consultar Bookings, entrega al menos una vez. Calendario multi-país/DST, paquetes, grupos, recurrencia, push/SMS y retención de datos comerciales pendientes. Migración 011 y contratos en docs/services.md, docs/bookings.md y docs/notifications.md.

- **2026-10-09, validación de Services/Bookings:** 58 pruebas unitarias y 58 escenarios de integración aislados aprobados (59 resultados incluyendo la suite); lint, tipos y build de API/worker, Prisma, límites hexagonales, formato y OpenAPI aprobados. Swagger tiene 168 operaciones: 21 Services y 15 Bookings. Probados cupos/replay concurrentes, rechazo de mascota ajena/conflictos, protección SQL de sobrecupo sin locks de aplicación, evidencia/proyecciones inmutables, rollback de auditoría y outbox, renovación de política/reprogramación, moderación, bloqueos/calendarios, decisiones manuales, vencimiento recuperable, asistencia/finalización/inasistencia, alojamiento y entrega de recordatorio por worker/Mailpit.

- **2026-10-09, despliegue local de Services/Bookings:** imagen API/worker construida y migración 011 aplicada exclusivamente en pettly_db de shared-network con rol pettly_dev. Verificadas seis tablas y catorce guards/triggers. API, worker y Mailpit saludables; Swagger 200, catálogo público 200 y rutas privadas sin credenciales 401. Cero servicios, recursos y reservas reales creados por la verificación. No hay configuración manual nueva para probar esta entrega local; pago de reservas sigue en establecimiento, pasarela externa y remitente de correo real pendientes.

- **2026-10-09:** Ampliado Notifications como feature hexagonal/DDD: inbox UUID por destinatario con lectura idempotente e inmutable, contador y filtros paginados; preferencias versionadas de correo Orders/Adoptions/Bookings, manteniendo bandeja y correo de acceso/organización/Auth obligatorios. Eventos mínimos de pedidos (pago solo verificado), solicitudes/entrega de adopción, organización/membresías y reservas escritos con auditoría/outbox en la misma transacción; replay por evento/destinatario, sin acceder a tablas privadas entre módulos. Ocho endpoints Zod/Swagger inglés. Superadmin consulta metadatos seguros de fallos y crea nuevo intento auditado solo para correo comercial fallido vigente, respetando preferencias, destinatario actual y deadline original; Auth tokens no se reenvían por esa vía. Worker consulta únicamente outbox/preferencias de Notifications, SMTP al menos una vez. Migración 012 añade inbox, preferencias y auditoría de retry, FKs/guards e identidad de entrega. UI, push, OTP/SMS en pausa, SMTP real, retención y rotación de claves pendientes. Contratos completos en docs/notifications.md.

- **2026-10-09, validación de Notifications:** 62 pruebas unitarias y 61 escenarios de integración aislados aprobados (62 resultados con suite). Verificados todos los productores, pago solo interno/verificado, aislamiento y lectura inmutable, versiones concurrentes de preferencias, cancelación de correo opcional, membresía obligatoria/idempotente, rollback integral de membresía ante fallo del inbox y recuperación concurrente auditada entregada por worker/Mailpit. Lint/tipos/build API-worker, esquema Prisma, formato, límites hexagonales y OpenAPI (176 operaciones, ocho Notifications) aprobados. Imagen Docker final construida; migración 012 aplicada únicamente en pettly_db como pettly_dev; tres tablas y seis guards/triggers comprobados. API/worker/Mailpit saludables; Swagger 200 y rutas privadas anónimas 401. Inbox/preferencias/auditoría de retry en cero en la base compartida; pruebas mutables ejecutadas únicamente en servicios temporales ya eliminados. No se requiere configuración manual nueva para operación local.

- **2026-10-09:** Implementados Veterinary y preparación operativa. Acreditación veterinaria por feature hexagonal, perfiles MV/MVZ, consentimiento y evidencia privada saneada mediante Media; revisión manual de identidad/titulación/matrícula/habilitación oficial COMVEZCOL por superadmin ajeno a empresa/profesional. Recheck máximo 90 días como política Pettly, no caducidad legal de matrícula. Recurso profesional dedicado de capacidad uno; Services y Bookings revalidan publicación/agenda/fin de cita/confirmación/inicio, revocación inmediata y snapshots históricos preservados. 11 endpoints Zod/Swagger en inglés, versiones/auditoría/transacciones/guards SQL. Directorio público de recursos en ServicesReadModule evita ciclos. Migración 013 añade credential/audit y guards/índices de operación. Limitación inicial: una matrícula/profesión vinculada a una agenda/empresa; práctica multiempresa requiere ampliar identidad y protección de ocupación global. Documentación en docs/veterinary.md.

- **2026-10-09:** Operación: health/live sin dependencias, health/ready PostgreSQL+Redis (503 diagnosticable aunque caiga el limiter), métricas Prometheus con token dedicado, JSON HTTP sin payload/datos privados, heartbeat de worker, reglas de alertas y monitoreo local opcional. Backup PostgreSQL custom cifrado AES-GCM/checksum, restauración completa en contenedor aislado sin red y comparación de inventario/migraciones; claves y archivos privados, backups excluidos de Git/Docker. Retención técnica acotada con dry-run de sesiones/actions vencidos >30 días y ciphertext terminal; sin borrar auditoría/finanzas/inbox/credenciales ni prometer retención legal. Carga local limitada con percentiles/status; plantillas Compose producción, TLS/systemd backup/restore/retención preparadas. Despliegue externo, destino de alertas y almacenamiento off-host pendientes de selección/acceso del usuario. Sin PITR/RTO/capacidad productiva garantizados. Ver docs/operations.md.

- **2026-10-09 — verificación veterinaria/operativa local:** 64 pruebas unitarias y 63 escenarios HTTP reales (64 resultados con suite), arquitectura y contratos OpenAPI de 190 operaciones. Migración 013 aplicada solo a pettly_db/pettly_dev; siete guards, sin profesionales sembrados. API/worker saludables y Prometheus con target activo y seis reglas. Backup local cifrado restaurado en PostgreSQL 15 aislado; dataset de pruebas con usuarios/pedidos/reservas/acreditación/inbox también restaurado sin tocar shared-network. Autenticación GCM completa antes de SQL y rechazo de clave incorrecta/manipulación con checksum recalculado. Carga local acotada: 265 solicitudes/5 s, concurrencia 3, todos 200, p95 13 ms; no equivale a capacidad productiva. Resultados/runbooks en docs/operations.md; hosting, DNS, SMTP real, alertas externas, custodia de claves y backups off-host pendientes de configuración.
