# Diseño de Pettly

Última actualización: 2026-10-10.

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

| Componente    | Tecnología           | Responsabilidad                                                   | Estado                                                                                                                                                               |
| ------------- | -------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api`    | NestJS + TypeScript  | Reglas de negocio, autenticación, autorización e integraciones    | Features de negocio implementadas; integración de pagos externa pendiente                                                                                            |
| `apps/web`    | Next.js + TypeScript | Experiencia del cliente, catálogo, compras, reservas y adopciones | Base implementada                                                                                                                                                    |
| `apps/admin`  | Angular + TypeScript | Backoffice de empresas, refugios y administración global          | Acceso, usuarios, organizaciones, veterinaria, catálogo, inventario, servicios, recursos, reservas, notificaciones, pedidos, pagos, animales y adopciones integrados |
| `apps/mobile` | Flutter / Dart       | Aplicación móvil Android e iOS                                    | Base implementada                                                                                                                                                    |
| `apps/worker` | Node.js + BullMQ     | Correos, notificaciones y tareas asíncronas                       | Implementado                                                                                                                                                         |
| Base de datos | PostgreSQL + Prisma  | Persistencia, relaciones, restricciones y migraciones             | Implementado                                                                                                                                                         |
| Redis         | Redis                | Límites de tráfico, colas y caché                                 | Implementado                                                                                                                                                         |

El monorepo usa Nx y pnpm. Node y pnpm se fijan en la configuración del repositorio. Flutter tiene su propio gestor de dependencias; Nx coordina sus comandos.

Se mantendrá una API modular con una base PostgreSQL y un worker separado. Las aplicaciones consumirán la misma API. Las reglas y permisos se aplicarán en el backend. No se introducirán microservicios inicialmente; una separación futura deberá responder a necesidades reales.

Paquetes compartidos previstos:

- `packages/api-client`: cliente generado desde OpenAPI para consumidores TypeScript.
- `packages/config`: configuración compartida cuando sea necesaria.

`packages/api-client` está implementado: contratos request/response y rutas generados desde OpenAPI, consumidos por Angular y comprobados contra la API en CI. `packages/config` sigue pendiente. `packages/notifications-runtime` contiene el contrato de correo, cifrado y runtime de notificaciones compartido con el worker. El mecanismo de generación del cliente Dart permanece pendiente.

## Arquitectura del backoffice

Angular moderno y standalone: todos los componentes declaran OnPush, Signals para estado y proveedor zoneless explícito. Tailwind 4 con tokens semánticos, responsive y accesibilidad. Features independientes; singletons de sesión/HTTP en core, UI reutilizable en shared, interfaces públicas mediante tokens y DTO generados sin importar dominio/Prisma del backend. Zod Mini con imports nombrados valida las respuestas consumidas y mappers producen modelos de interfaz. Guards funcionales, carga lazy, problemas seguros, bearer solo en memoria y refresh cookie HttpOnly. Renovación coordinada entre pestañas mediante Web Locks/BroadcastChannel; backend valida permisos por acción y organización. Detalles y límites operativos en [Backoffice](docs/backoffice.md).

La entrega incluye pruebas Vitest, navegador real con API/PostgreSQL/Redis/Mailpit aislados, axe y presupuestos Lighthouse. El control de arquitectura y ESLint hacen obligatorio OnPush; CI comprueba contratos OpenAPI generados. Gestión de usuarios y organizaciones implementadas por features; revisión veterinaria administrativa implementada; categorías y revisión de productos implementadas; inventario y gestión de servicios implementados; recursos/agendas/disponibilidad, reservas, notificaciones y pedidos implementados.

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

Entrega actual: Users + Auth, persistencia, seguridad, correos y pruebas. Authorization y Organizations permiten los siete roles aprobados y el alta, revisión y gestión de empresas/refugios; Animals + Media + Adoptions implementan el recorrido de adopción; Cart + Orders completan carrito, cotización y pedidos; siguiente integración: ePayco sobre el núcleo de Payments. El backoffice consume Auth, Users, Authorization y Organizations para acceso, sesión, cuenta y administración de usuarios y organizaciones; la web cliente y Flutter mantienen su base. La revisión de acreditaciones veterinarias también está implementada; categorías y revisión de productos implementadas; inventario y gestión de servicios implementados; siguiente entrega: recursos, disponibilidad y reservas.

| Elemento                                                                | Estado actual                                                                |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Monorepo Nx + pnpm y bases de las cuatro aplicaciones                   | Implementado                                                                 |
| Docker de API/web/admin, Husky y CI                                     | Implementado                                                                 |
| Creación de `pettly_db` y migraciones Prisma                            | Implementado                                                                 |
| Users/Auth: CRUD administrativo y seguridad de cuentas, salvo OTP       | Implementado                                                                 |
| Backoffice: Tailwind, OnPush, Signals, zoneless, login, sesión y cuenta | Implementado con usuarios, organizaciones, Veterinary, catálogo e inventario |
| OTP por SMS y códigos de respaldo                                       | En pausa por decisión del usuario                                            |
| Redis para límites de tráfico                                           | Implementado                                                                 |
| Worker, BullMQ, outbox y correo local                                   | Implementado                                                                 |
| Pruebas de negocio e integración de autenticación                       | Implementado                                                                 |
| Authorization y gestión de Organizations                                | Implementado                                                                 |
| Animals, Media y Adoptions                                              | Implementado                                                                 |
| Catalog e Inventory                                                     | Implementado                                                                 |
| Cart, cotizaciones y Orders                                             | Implementado; pagos reales pendientes                                        |
| Payments                                                                | Núcleo implementado; pasarela y reembolsos externos pendientes               |
| Services y Bookings                                                     | Implementado; cobro en establecimiento, prepago pendiente                    |
| Demás módulos                                                           | Planificado                                                                  |

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

- **2026-10-09 — backoffice:** implementada base Angular con Tailwind 4, todos los componentes OnPush, Signals y zoneless. Login, refresh HttpOnly rotatorio con coordinación entre pestañas, logout real, guards lazy, shell, inicio y cuenta/acceso conectados con API; DTO OpenAPI generado, Zod Mini y mappers, errores seguros, responsive/a11y y pruebas Vitest/Playwright sobre servicios aislados. CRUD Users y revisiones Organizations/Veterinary pendientes para siguientes recorridos. Documentación en docs/backoffice.md.

- **2026-10-09 — validación backoffice:** 12 pruebas unitarias Angular y dos escenarios de navegador aprobados sobre infraestructura aislada, incluyendo sesión entre pestañas y revocación real. Axe sin violaciones en checks WCAG A/AA; Lighthouse del acceso: rendimiento 99, accesibilidad 100, buenas prácticas 100. Build, tipos estrictos, lint, formato, arquitectura, contratos generados y sintaxis Actions aprobados; admin Docker en localhost:4300, SPA y proxy de readiness 200. Bundle inicial ~336 KB raw/~90 KB comprimido estimado. Sin sembrar ni modificar usuarios reales.

- **2026-10-09 — gestión de usuarios en backoffice:** feature Users lazy para super_admin con búsqueda/filtros/paginación en URL, invitación/reenvío sin contraseña ni rol inicial, detalle y edición validada, activación/desactivación y roles globales auditados, membresías compatibles por organización y lectura de auditoría. NgRx SignalStore con Entities, cancelación de lecturas obsoletas y exclusión de mutaciones duplicadas; gateway por puerto, DTO/path/query generados OpenAPI y validación Zod Mini. Confirmar revocación propia expira la sesión local y otras pestañas. Todos los componentes OnPush, zoneless y Tailwind. Cuentas eliminadas de solo lectura; sin botón de borrado irreversible. Ver docs/backoffice-users.md.

- **2026-10-09 — verificación Users en Angular:** 21 pruebas unitarias y tres escenarios de navegador reales aprobados sobre PostgreSQL/Redis/Mailpit aislados. Invitación y reenvío invalidando enlace anterior, paginación y búsqueda, edición/limpieza de campos, estados, rol, membresía de empresa y retirada, auditoría, protección del último superadmin y bloqueo de moderador en UI/API. Axe sin violaciones en pantallas probadas; auditoría móvil sin overflow. Tipos/build/lint/formato/arquitectura y cliente generado de 190 operaciones aprobados; 22 componentes explícitamente OnPush. Lighthouse acceso: 98/100/100, bundle inicial ~357 KB raw/~96 KB comprimido estimado. Sin modificar datos reales ni Redis compartido.

- **2026-10-09 — organizaciones en backoffice:** feature Organizations lazy para super_admin: búsqueda/filtros/paginación en URL, creación y edición validada, detalle, envío/rechazo/reenvío/aprobación, selección explícita de responsable activo/verificado, transferencia, suspensión/reactivación, miembros y auditoría. NgRx SignalStore con Entities, lecturas cancelables y mutaciones excluyentes; puertos, gateway, DTO generados, mappers y Zod Mini. Motivo obligatorio y expectedVersion; conflicto exige revisión y actualización explícita, sin reintento automático. Todos los componentes OnPush, zoneless y Tailwind. Suspensión retira capacidades operativas sin borrar permisos globales independientes. Documentos legales y acreditación veterinaria no se simulan; UI veterinaria es la siguiente entrega. Ver [Backoffice Organizations](docs/backoffice-organizations.md).

- **2026-10-09 — contratos y verificación Organizations UI:** corregida reflexión Swagger de strings nullable de Organizations con límites existentes, regenerado cliente de 190 operaciones y añadido control del tipo real en exportación; sin migración ni cambios de dominio. 31 pruebas unitarias Angular, 64 unitarias API y cuatro escenarios de navegador con servicios aislados aprobados. Ciclo completo, cambios concurrentes, responsables y permisos actuales, paginación/filtros, rechazo/reenvío de refugio, usuarios y autenticación. Axe sin violaciones en vistas probadas, revisión visual desktop/móvil y sin overflow móvil. Lighthouse acceso: 98/100/100. No se modifican usuarios u organizaciones reales ni claves de Redis compartido.

- **2026-10-09 — revisión veterinaria en Angular:** feature lazy para super_admin con cola paginada, filtros por estado/organización y consulta por UUID; perfil profesional y evidencias privadas cargadas bajo demanda mediante transporte JPEG tipado/autenticado. Previews en memoria con URL revocada al cerrar/reemplazar/salir; sin almacenamiento local ni optimizador externo. Decisión explícita, motivo, comprobación oficial manual, referencia y fecha de revisión futura ≤90 días (política Pettly, no vencimiento legal). UI y API protegen independencia respecto al profesional/empresa, expectedVersion y conflictos sin reintento; rechazo, revocación y auditoría versionada. OnPush/Signals/zoneless/Tailwind, NgRx SignalStore y rxResource, puertos/mappers/Zod Mini y OpenAPI. Corrección del contrato nullable verificationReference con su límite existente, sin migración. Creación, corrección, carga y reenvío profesional siguen en API; pantallas de autoservicio y agendas/servicios son entregas aparte. Ver [Backoffice Veterinary](docs/backoffice-veterinary.md).

- **2026-10-09 — verificación Veterinary UI:** 41 pruebas unitarias Angular, 64 de API y cinco escenarios de navegador aprobados sobre infraestructura aislada. Evidencias JPEG autenticadas/no-store, denegación a moderador, revisor superadmin miembro de empresa bloqueado en UI/API, versiones obsoletas, fechas inválidas, rechazo/reenvío, aprobación y revocación/auditoría. Axe sin violaciones en vistas probadas, móvil sin overflow y revisión visual; Lighthouse acceso 97/100/100. 42 componentes explícitamente OnPush; tipos, lint, arquitectura, builds, contratos de 190 operaciones y formato aprobados. Ningún profesional real creado o aprobado ni claves compartidas modificadas.

- **2026-10-09 — catálogo en backoffice:** feature lazy Angular para categorías de superadmin y revisión de productos por moderador/superadmin independiente. Alta, edición, activación/desactivación y auditoría de categorías; cola con búsqueda, filtros empresa/categoría y paginación en URL; perfil, variantes/precios en unidades mínimas y fotografías privadas, aprobación/rechazo con motivo y expectedVersion. OnPush/Signals/zoneless/Tailwind, puertos/gateway/mappers/DTO OpenAPI/Zod Mini y NgRx SignalStore. Dos lecturas hexagonales adicionales en API permiten preview/JPEG de producto pendiente de empresa activa sin conceder catalog.manage, excluyendo creador/miembros. Cliente generado de 192 operaciones; corrección de reflexión nullable existente sin migración. Viewer privado reutilizado por Veterinary. CRUD proveedor e inventario son entregas posteriores. Ver [Backoffice Catalog](docs/backoffice-catalog.md).

- **2026-10-10 — verificación Catalog UI:** 46 pruebas unitarias Angular, 66 API y seis escenarios de navegador con PostgreSQL/Redis/Mailpit aislados aprobados. Categorías/auditoría, filtros/paginación, fotografía autenticada/no-store, creador/miembros excluidos y moderador autorizado sin catalog.manage, decisiones concurrentes, COP en unidades mínimas y visibilidad al desactivar/reactivar categoría. Axe sin violaciones en vistas probadas; preview móvil de 390px sin overflow, revisión visual y Lighthouse acceso 98/100/100. 51 componentes OnPush, controles de tipos/lint/arquitectura y contratos de 192 operaciones aprobados. Sin fixtures en DB compartida ni modificaciones de Redis compartido. Siguiente recorrido: inventario del backoffice.

- **2026-10-10 — ejecución local Catalog:** API/admin Docker reconstruidos y saludables; SPA catálogo/categorías y readiness por proxy 200, Swagger vivo con 192 operaciones y preview anónimo 401. Verificación de shared-network exclusivamente de lectura; no hay migración ni configuración manual nueva.

- **2026-10-10 — inventario en Angular:** selección de empresas activas por superadmin y equipos autorizados, lista de productos/variantes/SKU con balances físico/reservado/disponible, búsqueda/estado/paginación en URL, detalle y ledger inmutable, entradas/salidas/ajustes firmados con motivo y expectedVersion. OnPush/Signals/zoneless/Tailwind, formas tipadas, puertos/gateway/mappers/Zod Mini/DTO OpenAPI y SignalStore. Consulta API listManagedInventory con límite 50 compone puerto InventoryCatalog y lecturas agrupadas de balances/holds vencidos, procesando expiración transaccional una vez con cutoff de página. Sin acceso cruzado a tablas, migración ni caché Redis; contratos de 193 operaciones. Reintento explícito conserva cuerpo/UUID original ante respuesta incierta, con exclusión de duplicados y aviso al salir; intención solo en memoria, no recuperable tras cierre. Reservas/pagos siguen en sus APIs/Orders; no se simulan controles de pago ni saldo absoluto. Ver [Backoffice Inventory](docs/backoffice-inventory.md).

- **2026-10-10 — verificación Inventory UI:** 54 unitarias Angular, 68 unitarias API y siete escenarios reales de navegador aprobados en PostgreSQL/Redis/Mailpit temporales. Lista/búsqueda/paginación por empresa sin N+1 HTTP, saldo virtual, entrada/salida/ajuste, reservas concurrentes y expectedVersion, reintento tras commit real con respuesta perdida sin duplicado, expiración/ledger Sistema, aislamiento de empresa/moderador, variante archivada de solo lectura y suspensión incluso para superadmin. Axe sin violaciones en vistas probadas, 390px sin overflow y revisión visual; Lighthouse acceso 97/100/100. 54 componentes OnPush y contratos de 193 operaciones. Controles de tipos/lint/arquitectura y cliente generado aprobados; sin fixtures o resets en servicios compartidos. Siguiente entrega: servicios y reservas en backoffice.

- **2026-10-10 — ejecución local Inventory:** API/admin Docker reconstruidos y saludables; `/inventario`, readiness por proxy y Swagger responden 200. OpenAPI vivo contiene 193 operaciones con listManagedInventory; inventario anónimo devuelve 401. Verificación de shared-network solo de lectura, sin migraciones ni nueva configuración manual.

- **2026-10-10 — servicios en Angular:** gestión por empresa con búsqueda/estado/categoría/paginación en URL, creación y reemplazo íntegro de perfil, COP convertido exactamente a unidades mínimas, formularios de cita/alojamiento con políticas, especies y recursos compatibles existentes. Envío a revisión, aprobación/rechazo independiente, pausa, archivo definitivo y auditoría inmutable. OnPush/Signals/zoneless/Tailwind, puertos/DTO generados/Zod Mini/mappers y SignalStore. Conflictos/resultados inciertos requieren consulta explícita sin replay automático; la creación no posee clave idempotente. Veterinaria pide acreditación UUID y recurso dedicado de capacidad uno con validación autoritativa de API, sin exponer evidencias profesionales. Corregida reflexión Swagger de reviewReason nullable usando restricciones existentes, sin migración ni endpoint nuevo. Agendas/recursos/bloqueos/disponibilidad y reservas serán la siguiente entrega. Ver [Backoffice Services](docs/backoffice-services.md).

- **2026-10-10 — verificación Services UI:** 63 unitarias Angular, 68 unitarias API y ocho escenarios reales de navegador aprobados con PostgreSQL/Redis/Mailpit aislados. Verificados COP decimal exacto, perfiles/citas/alojamiento, recursos, envío/publicación/rechazo independiente y reenvío, versiones obsoletas sin replay, pausa/archivo/historial, acreditación inexistente, scope, creador excluido, moderador sin gestión operativa y suspensión. Axe sin violaciones en vistas probadas, detalle a 390px sin overflow y revisión visual escritorio/móvil; Lighthouse acceso 98/100/100. 59 componentes OnPush; tipos/lint/arquitectura/build/formato/contratos de 193 operaciones aprobados. Corregida sincronización de prueba de invitación antes de axe y espera de decisión confirmada antes de la siguiente operación, sin omitir controles. Siguiente entrega: recursos, calendarios/bloqueos, disponibilidad y reservas.

- **2026-10-10 — ejecución local Services UI:** imágenes API/admin reconstruidas y contenedores saludables. `/servicios`, readiness por proxy y Swagger responden 200; OpenAPI vivo mantiene 193 operaciones y reviewReason como string nullable. Rutas privadas anónimas devuelven 401. Comprobaciones en shared-network solo de lectura; sin migración ni configuración manual nueva.

### Backoffice resources, schedules and availability

Services owns company-scoped resource creation/editing, weekly calendars, future full-capacity blocks, permanent releases and immutable history. Angular uses generated contracts, named Zod Mini mappers, ResourceGateway/HTTP adapter and page-scoped SignalStores; standalone components remain OnPush and zoneless with Tailwind. Calendar and datetime inputs explicitly use America/Bogota independent of browser timezone. Published-service availability is advisory, bounded to 31 dates / 180-day horizon, 1,000 returned slots and 50 rendered per page. PostgreSQL remains allocation authority. Stale versions or uncertain writes require explicit refresh; no automatic replay. Resource audit reads reuse existing persisted rows through hexagonal ports (194 OpenAPI operations, no migration). See [Backoffice resources](docs/backoffice-resources.md). Booking management is now implemented; see [Backoffice bookings](docs/backoffice-bookings.md).

- **2026-10-10 — verificación Resources UI:** 74 unitarias Angular, 68 unitarias API y nueve recorridos reales aprobados con PostgreSQL/Redis/Mailpit aislados. Probados intervalos solapados, agendas de siete días, alojamiento de días completos, edición obsoleta, conversión Colombia con navegador en Madrid, disponibilidad, bloqueo/liberación e historial, protección de reservas ante cambios de calendario/capacidad y scope. Axe sin violaciones en vistas probadas, detalle móvil a 390px sin overflow y revisión visual de agenda compacta. 63 componentes OnPush; tipos/lint/arquitectura/build/formato y contratos de 194 operaciones aprobados. Corregidas etiquetas explícitas de selectores para que las opciones no alteren su nombre accesible. Siguiente tarea del backoffice: gestión de reservas.

- **2026-10-10 — ejecución local Resources UI:** API y admin Docker reconstruidos y saludables. `/servicios/recursos`, readiness por proxy y Swagger responden 200. OpenAPI publicado contiene 194 operaciones, incluido listServiceResourceAudit; historial anónimo devuelve 401. PostgreSQL de shared-network permanece sin fixtures, resets ni migraciones nuevas.

### Gestión de reservas en backoffice

Feature Bookings lazy independiente: selección explícita de empresa, búsqueda/paginación/filtros en URL, detalle del acuerdo aceptado de cita/alojamiento y COP, decisiones del proveedor y auditoría inmutable por revisión. Acceso scoped bookings.manage para equipos activos o superadmin; moderador global sin acceso privado. Puertos/gateway, DTO OpenAPI generado, Zod Mini/mappers y SignalStore; todos los componentes OnPush/Signals/zoneless/Tailwind. API añade búsqueda literal case-insensitive en nombres aceptados de servicio/mascota/contacto mediante query/puerto/repositorio hexagonal existente, sin migración ni caché Redis. Confirmación/rechazo/cancelación/asistencia/finalización/inasistencia con motivo, confirmación y expectedVersion; conflictos/resultados inciertos requieren refresh explícito, sin replay. Condiciones históricas no dependen de perfiles actuales; proyección UI omite claves técnicas y no consulta datos privados adicionales. Horarios Colombia, reloj de UI orientativo cada 15 segundos sin polling; PostgreSQL/API autoritativos. Reservas se cobran en establecimiento, no hay marca ficticia de pago. Contratos y pruebas en [Backoffice bookings](docs/backoffice-bookings.md).

- **2026-10-10 — verificación Bookings UI:** 85 unitarias Angular, 68 unitarias API y diez recorridos reales de navegador aprobados en PostgreSQL/Redis/Mailpit aislados. Probados búsqueda case-insensitive/wildcards literales, paginación, condiciones originales tras edición de servicio, decisiones/motivos, versión obsoleta, resultado perdido después de commit sin replay, historial, vencimiento, atención/finalización/inasistencia, alojamiento y permisos/suspensión. Ventanas de asistencia/inasistencia y vencimiento usan helper de reloj de aplicación exclusivamente en pettly_test, no timestamps de dev ni hooks HTTP productivos. Axe sin violaciones en vistas probadas, móvil 390px sin overflow, revisión visual y Lighthouse acceso 97/100/100. 67 componentes OnPush; tipos/lint/arquitectura/build/contratos de 194 operaciones aprobados. Corregida estructura semántica del precio en dl y carrera del helper de login al leer respuesta tras navegación.

- **2026-10-10 — ejecución local Bookings UI:** API/admin Docker reconstruidos; /reservas, readiness por proxy y Swagger 200. Contrato publicado: 194 operaciones, búsqueda managed con límites y descripción en inglés; ruta privada anónima 401. Verificación compartida solo de lectura, sin migración, fixtures ni configuración manual nueva.

### Notificaciones en backoffice

Feature Notifications lazy independiente: bandeja personal con contador/búsqueda por categoría/leído/paginación en URL, lectura individual idempotente y masiva confirmada con cutoff tomado de eventos del servidor; preferencias de correo opcionales versionadas, manteniendo in-app/organizaciones/Auth obligatorios; superadmin consulta metadatos seguros de fallos y solicita nuevo intento con motivo/confirmación. Recibo de intento no simula entrega. Reintento idempotente por padre; conflictos/resultados inciertos requieren refresh, sin replay automático. Gateway por puerto, DTO OpenAPI/Zod Mini/mappers, tres SignalStores page-scoped, siete componentes OnPush/Signals/zoneless/Tailwind. Sin polling, caché Redis adicional ni persistencia de inbox en navegador. Corregida reflexión Swagger de strings nullable de delivery con límites existentes de DB, sin migración ni endpoint nuevo (194 operaciones). Backend mantiene permisos/recipiente/preferencias/deadline autoritativos. Cliente puro sin acceso al backoffice sigue pendiente de su web/mobile. Ver [Backoffice Notifications](docs/backoffice-notifications.md).

- **2026-10-10 — verificación Notifications UI:** 96 unitarias Angular, 68 API y once recorridos reales de navegador aprobados en PostgreSQL/Redis/Mailpit temporales. Probados filtros/paginación/reload, lectura idempotente e individual privada, cutoff que preserva eventos nuevos, canales obligatorios, preferencias obsoletas/respuesta perdida tras commit sin replay, strings nullable legados, recuperación con motivo/auditoría/hijo estable y entrega real por worker/Mailpit, aislamiento y denegación a equipos no superadmin. Fixtures de fallo solo en loopback pettly_test y prefix aislado; sin datos reales ni SMTP compartido alterados. Axe sin violaciones en vistas probadas; preferencias/recuperación móviles 390px sin overflow, revisión visual y Lighthouse acceso 98/100/100. 74 componentes OnPush; tipos/lint/arquitectura/build y contratos de 194 operaciones aprobados. Foco gestionado en formulario/recibo y navegación lateral desplazable en pantallas bajas.

- **2026-10-10 — ejecución local Notifications UI:** API/admin Docker reconstruidos y saludables. /notificaciones, /notificaciones/preferencias, /notificaciones/entregas, readiness por proxy y Swagger 200. Inbox/recovery anónimos 401. OpenAPI vivo refleja subjectType/mailPurpose/failureKind como strings nullable acotados. Sin migración, variables nuevas ni configuración manual adicional; verificaciones compartidas solo de lectura.

## Backoffice de pedidos — 2026-10-10

Gestión lazy de pedidos por empresa con orders.fulfillment.manage: búsqueda literal de destinatario/ciudad aceptados o UUID exacto, estado y paginación en URL. Detalle con compra y reparto inmutables, contacto, pago verificado y auditoría. Cancelación solo sin pago, preparación/despacho/recogida/entrega secuenciales con razón, confirmación y expectedVersion. OnPush/Signals/zoneless/Tailwind, DTO generados y proyecciones Zod Mini; conflictos/resultados inciertos requieren actualizar sin repetición automática. API amplía únicamente el filtro de búsqueda, sin migración. La pasarela real y la vista financiera de intentos/distribución siguen pendientes. Ver [Backoffice Orders](docs/backoffice-orders.md).

Verificación de pedidos: 107 pruebas Angular, 69 API y doce escenarios de navegador aprobados con infraestructura aislada; axe sin violaciones en las vistas probadas, detalle móvil sin desbordamiento y Lighthouse de acceso 98/100/100. Los 78 componentes son OnPush. Docker API/admin saludables; Swagger incluye búsqueda de pedidos y mantiene 194 operaciones.

- **2026-10-10 — pagos en Angular:** feature lazy `/pagos` con ámbitos explícitos plataforma/empresa, estado/paginación en URL, consulta UUID, detalle y comisión aceptada inmutable, distribución separada de aprobación, historial paginado y evidencia financiera normalizada bajo demanda para superadmin. Solicitud de conciliación con cuerpo vacío, confirmación, exclusión de duplicados y revisión explícita tras solicitud/conflicto/incertidumbre; pasarela real deshabilitada hasta su integración. Cuatro componentes OnPush, Signals/zoneless/Tailwind, SignalStore, puerto/gateway/mappers/Zod Mini y DTO generados. API permite supervisión global de detalle/historial incluso para empresa suspendida sin habilitar acceso financiero de miembros; no omite errores de autenticación/dependencias. Corregida reflexión Swagger de referencia nullable con límite de dominio existente de 200, sin migración. Ver docs/backoffice-payments.md.

- **2026-10-10 — verificación Payments UI:** 131 unitarias Angular, 71 API y los 13 escenarios completos de navegador aprobados con infraestructura desechable. Pagos verifica ámbito empresa/plataforma, paginación/estado, comisión aceptada, captura y distribución separadas, observación inconsistente, historial y supervisión de empresa suspendida, bloqueo de administrador ajeno/moderador y proveedor real deshabilitado (503). Axe sin violaciones en vistas probadas; detalle móvil 390px sin overflow y capturas revisadas. Lighthouse acceso 98/100/100; 82 componentes explícitos OnPush, tipos/lint/build/formato/arquitectura y drift de 194 operaciones aprobados. Prueba adicional impide reponer evidencia por respuesta tardía tras perder acceso. Sin fixtures de desarrollo compartido ni movimientos reales de dinero.

- **2026-10-10 — ejecución local Payments:** API/admin Docker reconstruidos y saludables; `/pagos` y readiness por proxy 200, Swagger `/api/docs` 200, OpenAPI vivo con 194 operaciones y referencia nullable de tipo string, pagos anónimos 401. Arranque de esta actualización con RUN_DATABASE_MIGRATIONS=false verificado dentro del contenedor: sin cambios de esquema ni migraciones sobre la base compartida. Pasarela real continúa deshabilitada.

### Backoffice shelter animals

The Angular Animals feature manages private records of active adoption entities through explicit organization scope, generated OpenAPI types, gateway/mappers, Zod Mini and page-scoped SignalStores. Five standalone OnPush components provide bounded search/pagination, creation/editing with exact kilogram-to-gram conversion, unknown health declarations, private notes/microchip, authenticated multipart photographs and immutable history. Death/archive actions require reason, confirmation and expectedVersion; adopted remains assigned only by confirmed Adoptions handover. Foreign/personal context is rejected, including superadmin URLs, and suspended shelters lose access. Conflicts and uncertain responses block repeated writes until explicit review; creation has no invented idempotency guarantee. Nullable boolean Swagger reflection was corrected without schema migration. Publication/application workflows follow separately. See [Backoffice Animals](docs/backoffice-animals.md).

- **2026-10-10 — validación Animals UI:** 155 unitarias Angular, 72 unitarias API y 14 escenarios aislados de navegador aprobados. Verificados registro/perfil, kg exactos, null frente a false, fotos privadas sanitizadas/eliminadas, conflictos y commit con respuesta perdida sin duplicar auditoría, archivo de solo lectura, paginación/búsqueda y denegación por permisos/suspensión. Axe sin violaciones en vistas probadas; listado a 390px sin overflow. 87 componentes OnPush, contratos de 194 operaciones y controles de tipos/lint/build/arquitectura aprobados. Sin migración ni fixtures en servicios compartidos. Siguiente entrega: publicaciones y solicitudes de adopción.

- **2026-10-10 — ejecución local Animals UI:** API/admin reconstruidos y saludables; `/animales`, readiness por proxy y `/api/docs` responden 200. Animals anónimo responde 401. OpenAPI vivo conserva 194 operaciones y confirma boolean nullable para vacunación/esterilización. Arranque con RUN_DATABASE_MIGRATIONS=false verificado dentro del contenedor; sin migraciones ni fixtures sobre PostgreSQL compartido.

### Backoffice adoption publications

Six standalone OnPush Angular components add lazy shelter listing/preparation/detail and independent global moderation, using generated OpenAPI DTOs, ports/gateway, Zod Mini and three scoped SignalStores. Colombia public text, active matching animal and explicit confirmation precede draft creation; submission captures the safe public animal snapshot with its attached photos. Pending profiles cannot edit, creator/entity members cannot moderate, real edits require renewed review, pause requires resubmission to resume, and archives are permanent/read-only. Conflicts and uncertain results block repeated writes until review; creation has no idempotency guarantee. Clinical/microchip/ownership/contact data do not enter snapshot projections. Operational audit remains shelter-only, separate from global moderation metadata. A new authenticated managed-photo read provides visual review before publication through existing Adoptions/Authorization/AnimalsCatalog/OrganizationAccess/Media ports with current eligibility and attachment checks, locks and no-store JPEG; no migration. Nullable administrative review reasons correctly reflect string/null in Swagger. Request/contact/handover UI is implemented in the subsequent delivery documented below. See [Backoffice Adoptions](docs/backoffice-adoptions.md).

- **2026-10-10 — validación Adoptions Publications UI:** 175 unitarias Angular, 72 API y 15 escenarios reales de navegador aislado aprobados; 93 componentes OnPush y 195 operaciones generadas. Verificados preparación, snapshots sin campos clínicos/microchip, revisión visual privada antes de publicar, anonimato/media arbitraria rechazados, rechazo/corrección/reenvío/aprobación independiente, retirada de foto, pausa, versión obsoleta, auditoría/archivo y suspensión. Moderación no obtiene auditoría operativa/contactos por ese permiso. Axe sin violaciones en vistas probadas y detalle de revisión a 390px sin overflow; capturas revisadas. Corregidos formularios de consulta UUID para evitar navegación nativa, incluido el recorrido de Animals relacionado. Sin migración ni fixtures en servicios compartidos. Próxima entrega: solicitudes y confirmación explícita de entrega.

- **2026-10-10 — ejecución local Adoptions Publications:** API/admin reconstruidos y saludables; `/adopciones`, `/adopciones/revision`, readiness por proxy y Swagger 200. Revisión/foto privada anónimas 401; OpenAPI vivo 195 operaciones con preview autenticado y reviewReason string nullable. RUN_DATABASE_MIGRATIONS=false verificado en contenedor; sin migraciones ni fixtures en PostgreSQL compartido ni configuración manual nueva.

### Backoffice adoption requests

The existing Adoptions feature adds shelter/publication-scoped request listing, current consented contact detail and review/approval/rejection through generated DTOs, a RequestsGateway, Zod Mini projections and page-scoped SignalStores. Three standalone components explicitly OnPush use typed reactive forms, Signals/zoneless and Tailwind. Global moderation permission alone does not open shelter operations. Contact remains only in authorized detail memory; audit is bounded complete publication history with request identifiers. Changed conditions require renewed applicant consent; self decisions, unsupported state transitions and stale expectedVersion are blocked. Approval keeps the animal active. Separate physical-handover declaration completes the existing atomic API transaction across request/publication/animal, competing requests, audits and notifications. Conflicts/uncertain responses block repeats until refresh, including a committed handover with a lost response. No new endpoint, migration or environment dependency. See [Backoffice adoption requests](docs/backoffice-adoption-requests.md).

- **2026-10-10 — validación Adoption Requests UI:** 194 unitarias Angular y 16 escenarios reales de navegador aislado aprobados; 96 componentes OnPush y 195 operaciones existentes. Consentimiento renovado, ausencia de contacto en listas, contactos autorizados, decisiones propias bloqueadas, versiones obsoletas y respuesta de entrega perdida con commit único verificados. Confirmación explícita adopta animal/cierra publicación y solicitudes competidoras; aprobación sola conserva animal activo. Suspensión elimina contacto y recarga redirige por guard. Axe sin violaciones en vistas probadas, móvil 390 px sin overflow y capturas revisadas; tipos/lint/build/arquitectura aprobados. Estabilizado helper de decisiones de Services evitando lectura innecesaria de cuerpo descartable por Chrome, sin modificar su comportamiento. Sin migraciones, dependencias/configuración nueva ni fixtures compartidos.

- **2026-10-10 — ejecución local Adoption Requests:** imagen Angular reconstruida y contenedor admin saludable. Adopciones/listado/detalle SPA, readiness por proxy y Swagger 200; APIs de contacto/listado anónimas 401; OpenAPI vivo mantiene 195 operaciones. Solo admin actualizado con --no-deps; Compose verificado sin migraciones de arranque. No se reinició/migró API/PostgreSQL compartido ni se crearon fixtures reales; sin configuración manual adicional.

- **2026-10-10 — gestión Products UI:** nueva feature `/productos` para empresas activas con `catalog.manage` y superadministración: listado/filtros por empresa, estado y categoría, creación/perfil, variantes/SKU/atributos/precios COP exactos, fotografías privadas, envío a moderación independiente, pausa/archivo e historial. `/catalogo` conserva taxonomía y revisión global. Cambios publicados vuelven a borrador; inventario conserva existencias y reservas. Contratos OpenAPI existentes, Zod, SignalStore, formularios tipados y seis componentes OnPush adicionales. Registros históricos USD/EUR son de solo lectura. Sin migraciones ni nuevos endpoints. Detalle y comprobaciones manuales en [Backoffice products](docs/backoffice-products.md).

- **2026-10-10 — validación Products UI:** 235 unitarias Angular y 17 escenarios reales de navegador aislado aprobados; 102 componentes OnPush. Creación por empresa, COP exactos, atributos, fotos privadas saneadas, revisión independiente, retorno a borrador y archivo conservando SKU/historial verificados. Mapper corregido para eventos existentes `product.submit/review/pause/archive` y prueba exige entradas reales sin alertas. Unitarias cubren ámbito/permisos, versiones obsoletas, no-op, respuestas inciertas y privacidad ante respuestas tardías tras perder acceso. Axe sin violaciones en la vista probada; móvil 390 px sin overflow y captura revisada. Tipos/lint/build/arquitectura aprobados; lint mantiene siete advertencias anteriores en pruebas de Resources. Sin migraciones, contratos nuevos ni fixtures compartidos.

- **2026-10-10 — ejecución local Products UI:** contenedor admin reconstruido y saludable; `/productos`, readiness por proxy y Swagger responden 200. Productos gestionados anónimos responden 401; OpenAPI vivo conserva 195 operaciones. Actualización solo de admin con `--no-deps` y configuración de migraciones deshabilitadas verificada; PostgreSQL/Redis compartidos sin fixtures ni cambios de esquema.

## Cierre operativo del backoffice

Se completan cuenta propia/seguridad/sesiones y enlaces de invitación, verificación, recuperación y cambio de correo; acceso de empresas/refugios a sus equipos/perfiles/historial; preparación veterinaria con evidencias privadas y selección nominal de profesionales elegibles; condiciones comerciales COP/Colombia con recogida, envío e impuestos explícitos; eliminación administrativa de cuentas y archivo de organizaciones. Los stores administrativos antiguos también bloquean repetición tras conflictos/resultados inciertos y suprimen respuestas anteriores a una actualización. Nuevas consultas veterinarias derivan titularidad del actor y exponen solo elegibilidad mínima. No requieren migración de datos.

El origen de los enlaces de correo local pasa al backoffice `http://localhost:4300` mediante `WEB_PUBLIC_URL`, compartido por API/worker. El cliente Next.js aún debe implementar su recorrido público. Mantener solicitudes/respuestas generadas, Zod Mini y separación feature-first; todos los componentes siguen OnPush/Signals/zoneless/Tailwind. Alcance, permisos y límites en [Cierre del backoffice](docs/backoffice-readiness.md), [Cuenta](docs/backoffice-account.md) y [Condiciones comerciales](docs/backoffice-commercial.md). La pasarela real sigue pendiente de activación externa; configurar condiciones comerciales no habilita cobros.

- **2026-10-10 — cierre verificado del backoffice:** 252 pruebas unitarias Angular, 80 API y 19 recorridos reales con PostgreSQL/Redis/Mailpit aislados aprobados. Tipado, lint sin errores, arquitectura y formato aprobados; 114 componentes OnPush, OpenAPI de 197 operaciones y Lighthouse 98/100/100. El historial de organizaciones permite administradores propios actuales y conserva el archivo exclusivo del superadmin. Sin migraciones ni fixtures en infraestructura compartida.

- **2026-10-10 — ejecución del cierre:** API/worker/admin Docker reconstruidos y saludables; rutas de cuenta, condiciones comerciales, veterinaria propia y recuperación en puerto 4300, readiness y Swagger responden 200; consultas veterinarias anónimas 401. Reinicio con `RUN_DATABASE_MIGRATIONS=false`, sin modificar fixtures compartidos.
