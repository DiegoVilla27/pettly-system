# Fuente de tecnico de Pettly

Copia de lectura del original `tecnico.docx`, descargado de Google Drive el 2026-10-08.

Fuente: https://docs.google.com/document/d/1QV7EIIFQ6T3nEMNURgWozZ_mcILuzWW1/edit

Última modificación de la fuente: 2026-10-08T12:32:29.422Z. Los DOCX conservan el original; esta copia extrae el texto en orden y no reproduce su formato. Las propuestas de la fuente siguen pendientes donde no exista una decisión aprobada en `DESIGN.md`.

Especificación técnica de la plataforma ANIMALES
CABUWEB | Proyecto ANIMALES
Versión 2.0 propuesta para revisión | 8 de octubre de 2026
1 Propósito y decisiones de arquitectura
Resumen técnico
Este documento define una propuesta implementable para ANIMALES y sus controles de calidad. Cubre identidad, catálogo, pedidos, pagos, reservas, adopciones y administración. Los requisitos NEG 01 a NEG 09 del documento de negocio son su referencia de alcance.
Se propone comenzar con un backend modular desplegado como una aplicación y PostgreSQL como fuente principal de datos. La arquitectura de microservicios del documento original se conserva como alternativa de evolución. La elección final depende de equipo, carga, presupuesto y necesidades operativas, aún por confirmar.
Alternativas y razones de la propuesta
La propuesta original incluye API Gateway, microservicios, MongoDB, Redis y Kubernetes. Su separación puede servir a módulos con equipos o cargas independientes, pero exige gestionar contratos distribuidos, consistencia, redes, despliegues y observabilidad. No hay datos de volumen que justifiquen asumir esa complejidad en el piloto.
El backend modular mantiene límites de dominio y facilita extraer un servicio cuando existan mediciones y responsabilidad operativa. Docker puede utilizarse desde el inicio; Kubernetes, MongoDB y un gateway dedicado se evaluarán ante necesidades concretas. Redis se incorpora cuando haya una función justificada de caché o coordinación, con recuperación definida.
Stack propuesto y decisiones abiertas
Web pública: Next.js. Paneles: Angular, conforme a la visión original. Aplicación móvil: Flutter en una entrega posterior, pendiente de aprobación. Backend: Node.js con NestJS como propuesta frente a la alternativa Express. Datos transaccionales: PostgreSQL. Archivos: almacenamiento de objetos privado con acceso controlado.
Se propone REST versionado y OpenAPI para el MVP. GraphQL, mencionado en el original, queda sujeto a un caso de uso demostrado. Proveedor cloud, región, versiones soportadas, ORM, identidad y pasarela deberán registrarse antes de implementar. No se fijan versiones ni capacidades sin comprobar compatibilidad y soporte.
2 Componentes y responsabilidades
Contexto y límites
Los clientes web, paneles y futuro móvil consumen una API por HTTPS. La API accede a PostgreSQL y almacenamiento de objetos y se integra con pasarela, notificaciones y geolocalización. Las claves de terceros permanecen en el servidor salvo credenciales públicas expresamente diseñadas para el cliente.
Módulos: identidad y permisos; organizaciones; catálogo e inventario; pedidos; pagos y reembolsos; servicios y disponibilidad; adopciones; moderación; notificaciones y auditoría. Cada módulo expone operaciones explícitas y evita que otros modifiquen directamente sus tablas.
Aislamiento entre organizaciones
Toda entidad empresarial debe asociarse a organization_id. El contexto de organización procede de una sesión autenticada y una membresía activa, no de un campo libre enviado por el cliente. Las consultas, exportaciones, archivos y trabajos asíncronos deben aplicar el mismo control.
Los roles propuestos son cliente, operador de empresa, administrador de empresa, operador de entidad de adopción, moderador y superadministrador. Cada permiso se define por acción y recurso. Las actuaciones del superadministrador se auditan; la visibilidad excepcional de datos requiere una necesidad operativa concreta.
Servicios externos y tareas asíncronas
Las notificaciones se desacoplan de la transacción principal mediante trabajos persistentes. El envío fallido no invalida un pedido confirmado. Si se publica un evento tras un cambio de datos, se propone una bandeja de salida transaccional para evitar perderlo entre confirmación y envío.
Para cada integración se deben definir timeout, reintentos limitados, identificadores de correlación, alertas y comportamiento degradado. Geolocalización facilita búsqueda y cobertura; una caída de mapas no debe impedir consultar datos de un pedido existente.
3 Datos y estados del dominio
Modelo conceptual
Identidad: User, Organization y Membership. Catálogo: Product, Category, SKU, Inventory y Media. Comercio: Order, OrderItem, Payment, Refund y Fulfillment. Servicios: Service, Resource, Availability y Booking. Adopciones: Animal, AdoptionEntity y AdoptionRequest. Operación: Report, AuditEvent y NotificationJob.
Las entidades tienen identificador, fecha de creación y actualización y las referencias necesarias a usuario u organización. Los pedidos guardan una copia del nombre, precio y condiciones relevantes de cada ítem; un cambio de catálogo no modifica ventas históricas.
Importes en COP mediante enteros en unidades mínimas o decimal de precisión fija, coherente con la pasarela; no usar punto flotante. Guardar instantes en UTC y zona de la reserva para presentarlos correctamente. Definir retención y anonimización por entidad.
Estados y transiciones
Pedido: pendiente de pago, confirmado, en preparación, despachado, entregado o cancelado. Pago: pendiente, aprobado, rechazado o expirado; el reembolso tiene registro y estado propios. No equiparar devolución, cancelación y reembolso.
Reserva: solicitada, confirmada, atendida, cancelada o no asistida. Solicitud de adopción: recibida, en revisión, contactada, cerrada o retirada. Animal: disponible, en proceso o adoptado, según actualización autorizada de la entidad.
Cada transición valida estado anterior, actor, reglas y efectos; guarda fecha y auditoría. Las transiciones no permitidas devuelven un conflicto identificable. El cierre de una solicitud no se contabiliza como adopción sin confirmación de la entidad.
Consistencia y restricciones
La creación del pedido y reserva de stock se ejecutan de forma atómica. Bloqueos, actualizaciones condicionales o restricciones deben impedir sobreventa; el diseño documentará cuándo vence la retención y cómo se libera.
Las reservas de recursos deben impedir solapamientos mediante controles de base de datos o transacciones equivalentes. Índices sobre organización, categoría, estado y fecha se validan con consultas reales. Los controles de aplicación se complementan con claves foráneas, unicidad y restricciones de integridad.
4 Contratos y flujos críticos
API y errores
Usar rutas /api/v1 con paginación, filtros limitados y validación de entradas. Documentar esquema, permisos y errores en OpenAPI. Ejemplos de recursos: /products, /orders, /bookings, /animals y /adoption-requests.
Errores: código estable, mensaje seguro, identificador de correlación y detalles de validación cuando proceda. Distinguir credenciales ausentes, acceso denegado, recurso no encontrado, conflicto y límite de solicitudes. Evitar revelar recursos de otras organizaciones.
Creación y pago de pedido
El servidor valida vendedor, stock, cobertura e importes y registra pedido y retención. Crea la operación de pago con identificador único. El cliente recibe datos necesarios para el checkout de la pasarela; el sistema no almacena números de tarjeta ni códigos de seguridad.
El webhook verifica firma o mecanismo oficial, deduplica por evento y aplica la transición una sola vez. Verifica importe, moneda y referencia contra el pedido y consulta la pasarela cuando exista inconsistencia. Un evento retrasado tras liberar stock requiere una regla de conciliación y eventual reembolso, sin confirmar mercancía inexistente.
POST de operaciones críticas admite clave de idempotencia vinculada al usuario y contenido. Repetir una petición devuelve el mismo resultado; reutilizar la clave con otro contenido produce conflicto. Conciliar pagos pendientes y cobros aprobados sin pedido confirmado mediante un trabajo recuperable.
Reservas y adopciones
La reserva comprueba horario, zona, recurso y capacidad dentro de una operación protegida contra concurrencia. Aplica la política aceptada al cancelar. El MVP propuesto permite pago directo al proveedor, sin declarar el importe como cobrado por la plataforma.
La solicitud de adopción valida disponibilidad y consentimiento para comunicar datos a la entidad. El panel solo muestra solicitudes de su entidad. Proteger formularios contra abuso y permitir retirada o cierre con historial. No publicar datos privados del interesado ni domicilios precisos en fichas públicas.
5 Seguridad y objetivos de calidad
Autenticación y autorización
Usar un proveedor de identidad o implementación revisada. Las contraseñas se almacenan mediante hash adaptativo con sal, nunca mediante cifrado reversible. Proponer verificación de correo, recuperación con tokens de un solo uso y MFA obligatorio para accesos administrativos.
Si se emplean JWT, validar firma, emisor, audiencia y caducidad; definir renovación, revocación y cierre de sesión. Para web, evaluar cookies Secure, HttpOnly y SameSite y controles CSRF según el flujo. OAuth integra autorización externa; para identidad se debe definir un flujo OIDC cuando corresponda.
Comprobar permisos en servidor en cada operación, limitar intentos y proteger subida de archivos mediante validación de tipo y tamaño, nombres controlados y análisis de contenido según riesgo. Secretos en un gestor dedicado; nunca en repositorio, navegador o logs.
Datos personales y auditoría
Minimizar datos y acceso, cifrar comunicaciones y almacenamiento según servicios elegidos y documentar conservación y borrado. La eliminación de cuenta debe distinguir datos prescindibles de registros cuya conservación haya sido jurídicamente validada.
Auditar actor, organización, acción, recurso, resultado y momento sin registrar contraseñas, tokens ni datos completos de pago. Definir permisos y retención de logs. Los requisitos de privacidad se concretarán con la revisión jurídica prevista en negocio.docx.
Metas propuestas para el piloto
Disponibilidad mensual objetivo de 99,5 % para API y web; latencia p95 inferior a 800 ms en consultas comunes de API, excluyendo servicios externos. Son metas de diseño pendientes de aprobar, no garantías actuales.
Proponer ensayo con 100 usuarios concurrentes, mezcla de operaciones acordada y catálogo representativo. Registrar errores, latencia y saturación. Objetivos iniciales de recuperación: RPO de 24 horas y RTO de 4 horas; revisar si resultan aceptables para pedidos y pagos.
Los flujos esenciales deben funcionar en móvil y teclado, con etiquetas, mensajes comprensibles y contraste suficiente. Las pantallas y formularios críticos se revisarán con referencia WCAG 2.2 nivel AA; no declarar conformidad sin evaluación.
6 Despliegue y operación
Entornos y entrega
Separar desarrollo, pruebas y producción con credenciales y datos propios. El pipeline ejecuta validaciones, pruebas, análisis de dependencias y construcción reproducible. Desplegar la versión aprobada con migraciones revisadas y verificación de salud.
Usar servicios gestionados para base de datos y almacenamiento si encajan en el presupuesto. La elección entre AWS, Google Cloud u otro proveedor requiere comparación de costo, región, recuperación y capacidades del equipo. No se compromete proveedor ni Kubernetes para el piloto.
Migraciones y recuperación
Las migraciones deben ser compatibles con la versión activa durante el despliegue o requerir una ventana acordada. La reversión de aplicación no garantiza revertir datos; preparar un procedimiento específico para cambios destructivos.
Programar copias cifradas y comprobar su restauración en un entorno separado. Definir frecuencia y retención para alcanzar el RPO aprobado. Mantener procedimientos para caída de pasarela, pérdida de acceso, fallos de notificación, restauración y reembolso pendiente.
Observabilidad y soporte
Métricas: errores y latencia por ruta, saturación de base de datos, cola de trabajos, pedidos pendientes, webhooks rechazados y discrepancias de pago. Vincular eventos con un identificador de correlación.
Establecer alertas con responsable y procedimiento, horarios de atención y criterios de severidad. Verificar salud de la aplicación y disponibilidad de dependencias por separado. Evitar incluir información personal en telemetría.
Evolución a servicios independientes
Extraer un módulo cuando necesite escala, despliegue o equipo propio y existan mediciones que lo justifiquen. Antes de separarlo, definir propiedad de datos, contrato versionado, recuperación, idempotencia y observabilidad distribuida.
MongoDB, Redis, GraphQL y Kubernetes se mantienen como opciones documentadas. Su incorporación requiere una decisión de arquitectura que detalle problema, alternativas, costo y validación, además de responsable de operación.
7 Verificación y trazabilidad
Pruebas y criterios de aceptación
NEG 01 y NEG 06: verificar recuperación de cuenta y rechazo de acceso a pedidos, archivos y reservas de otra organización. NEG 02: comprobar filtros y oferta no publicada. NEG 03: ensayar stock concurrente, pago rechazado, webhook repetido, cobro tardío y reembolso.
NEG 04: dos solicitudes concurrentes no exceden capacidad; cancelación libera recursos según política. NEG 05: entidad accede solo a sus solicitudes y un cierre no marca adopción automáticamente. NEG 07 y NEG 08: moderación e incidencias guardan actor e historial. NEG 09: validar información, acceso y retirada de datos según la política aprobada.
Combinar pruebas unitarias de reglas, integración con PostgreSQL y pasarela en sandbox y pruebas completas desde interfaz. Ensayar trabajos fallidos y restauración; las pruebas aisladas con mocks no acreditan comportamiento de pagos ni concurrencia.
Condiciones para lanzar
No debe haber defectos críticos abiertos ni accesos cruzados entre organizaciones. El equipo debe aportar resultados de los flujos críticos, prueba de recuperación, conciliación, revisión de seguridad y aceptación operativa. El Product Owner acepta alcance y los responsables designados validan sus áreas.
Las metas de rendimiento se contrastan en un entorno representativo. Presupuesto, volumen real, pruebas de carga y dependencia de terceros deben figurar en el acta de lanzamiento, junto con limitaciones y plan de atención. No se fija una fecha de entrega sin estimación.
Decisiones pendientes y referencias
Registrar elección de NestJS o Express, REST o GraphQL, backend modular o microservicios, proveedor y región, identidad, pasarela, manejo de stock, recursos de reservas y metas operativas. La aprobación de una decisión actualiza ambos documentos y el backlog.
Referencia para autenticación y autorización: documentación oficial de NestJS. https://docs.nestjs.com/security/authentication y https://docs.nestjs.com/security/authorization
Referencia para transacciones: documentación oficial de PostgreSQL. https://www.postgresql.org/docs/current/sql-set-transaction.html
Versión 2.0 propuesta para revisión. Este documento expresa diseño y criterios de comprobación; no certifica una implementación existente ni decisiones aprobadas.
