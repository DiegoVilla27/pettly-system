# Seeds de pruebas manuales de Pettly

Actualizado: 2026-10-11. Implementado exclusivamente para la base local `pettly_db`, con el rol PostgreSQL `pettly_dev` en `global_postgres`, red `shared-network`. Esta guía contiene credenciales **ficticias de pruebas**, públicas y deliberadamente conocidas; no son secretos de infraestructura ni cuentas de producción.

## Acceso y contraseña

- Backoffice: <http://localhost:4300>.
- Swagger: <http://localhost:3100/api/docs>.
- Correos de invitación, verificación y recuperación: Mailpit <http://localhost:8025>.
- Contraseña inicial de las **18 cuentas con contraseña**: `PettlyDemo2026!`.
- `invited@pettly.test` es una invitación pendiente: **no tiene contraseña** hasta aceptar el enlace de Mailpit y elegir una.

Los correos `.test` no necesitan existir en un proveedor externo. El worker envía a Mailpit. Todos los perfiles usan datos sintéticos de Colombia/Bogotá, teléfono de ejemplo y fecha de nacimiento; nadie ha verificado la propiedad de esos teléfonos ni datos profesionales.

## Cuentas y finalidad

Todas las cuentas con contraseña tienen el apellido `Pruebas Pettly`. Salvo `disabled` y `unverified`, están activas y con email verificado. El rol global y las membresías son cosas distintas: una cuenta de empresa/refugio conserva el rol global `user`; los permisos operativos vienen de su organización actual.

| Email                           | Contraseña inicial                | Rol global    | Membresías / estado                                                                    | Para qué usarla                                                                                                                                                                                               |
| ------------------------------- | --------------------------------- | ------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `superadmin@pettly.test`        | `PettlyDemo2026!`                 | `super_admin` | Sin membresías                                                                         | Gestionar usuarios, roles, organizaciones, categorías, revisiones, acreditaciones y supervisión de pagos; no pertenece a las entidades que revisa.                                                            |
| `superadmin.backup@pettly.test` | `PettlyDemo2026!`                 | `super_admin` | Sin membresías                                                                         | Segundo administrador para probar cambios/suspensión del otro y protección del último superadmin activo.                                                                                                      |
| `moderator@pettly.test`         | `PettlyDemo2026!`                 | `moderator`   | Sin membresías                                                                         | Revisar productos, servicios y publicaciones de adopción; comprobar que no puede administrar usuarios, roles ni acreditaciones.                                                                               |
| `business.admin@pettly.test`    | `PettlyDemo2026!`                 | `user`        | `business_admin`, Demo Mascotas Bogotá                                                 | Perfil/equipo/historial propio, productos, inventario, servicios, recursos, reservas, política comercial, pedidos y consulta financiera propia.                                                               |
| `business.operator@pettly.test` | `PettlyDemo2026!`                 | `user`        | `business_operator`, Demo Mascotas Bogotá                                              | Operaciones de catálogo/inventario/servicios/reservas/pedidos; comprobar que no puede asignar roles, consultar perfil/equipo/historial organizativo privado ni gestionar política comercial/pagos de empresa. |
| `business.other@pettly.test`    | `PettlyDemo2026!`                 | `user`        | `business_admin`, Demo Mascotas Medellín                                               | Verificar aislamiento: no puede gestionar los recursos de Demo Mascotas Bogotá.                                                                                                                               |
| `shelter.admin@pettly.test`     | `PettlyDemo2026!`                 | `user`        | `adoption_admin`, Demo Refugio Huellas                                                 | Perfil/equipo/historial propio, animales, fotos, publicaciones, contacto consentido, solicitudes y confirmación de entrega.                                                                                   |
| `shelter.operator@pettly.test`  | `PettlyDemo2026!`                 | `user`        | `adoption_operator`, Demo Refugio Huellas                                              | Animales/publicaciones/solicitudes; comprobar límites de administración del refugio y denegación de operaciones comerciales de empresa.                                                                       |
| `multirole@pettly.test`         | `PettlyDemo2026!`                 | `user`        | `business_admin` en Demo Mascotas Bogotá y `adoption_operator` en Demo Refugio Huellas | Cambiar de ámbito; comprobar que una membresía no amplía permisos en la otra organización. No es el responsable principal de la empresa.                                                                      |
| `vet.approved@pettly.test`      | `PettlyDemo2026!`                 | `user`        | `business_operator`, Demo Mascotas Bogotá                                              | Ver su acreditación sintética aprobada, documentos privados y elegibilidad clínica; comprobar aislamiento respecto a documentos del otro profesional.                                                         |
| `vet.pending@pettly.test`       | `PettlyDemo2026!`                 | `user`        | `business_operator`, Demo Mascotas Bogotá                                              | Ver su acreditación pendiente y probar aprobación/rechazo con superadmin independiente; no es elegible hasta aprobarla.                                                                                       |
| `suspended.admin@pettly.test`   | `PettlyDemo2026!`                 | `user`        | `business_admin`, Demo Empresa Suspendida                                              | La cuenta sigue activa pero la organización no concede permisos operativos. Probar reactivación como superadmin y posterior recuperación del acceso.                                                          |
| `applicant@pettly.test`         | `PettlyDemo2026!`                 | `user`        | Sin membresías; solicitante de las organizaciones pendiente/rechazada                  | Onboarding por Swagger: ser solicitante no concede acceso administrativo al backoffice. Aprobar seleccionando explícitamente al responsable.                                                                  |
| `customer@pettly.test`          | `PettlyDemo2026!`                 | `user`        | Sin membresías                                                                         | Cliente con mascota, reservas, dos pedidos e intentos de pago y solicitud de adopción aprobada. Usar Swagger; no puede entrar al espacio de gestión.                                                          |
| `customer.second@pettly.test`   | `PettlyDemo2026!`                 | `user`        | Sin membresías                                                                         | Segundo solicitante de adopción en revisión; probar privacidad entre clientes y cierre de solicitudes competidoras tras entrega.                                                                              |
| `disabled@pettly.test`          | `PettlyDemo2026!`                 | `user`        | Deshabilitada, email verificado                                                        | Login denegado; reactivar como superadmin y volver a iniciar sesión.                                                                                                                                          |
| `unverified@pettly.test`        | `PettlyDemo2026!`                 | `user`        | Activa, email sin verificar                                                            | Login denegado por verificación pendiente. Usar reenviar verificación y completar el enlace de Mailpit. Verificarla no le da permisos de gestión.                                                             |
| `disposable@pettly.test`        | `PettlyDemo2026!`                 | `user`        | Sin membresías ni responsabilidad                                                      | Edición, asignación de roles, activación/desactivación y eliminación/anonimización sin destruir los escenarios de otras cuentas.                                                                              |
| `invited@pettly.test`           | Sin contraseña; elegir al aceptar | `user`        | Activa, invitación pendiente, email sin verificar                                      | Aceptar invitación de Mailpit, establecer contraseña y comprobar que no recibe roles administrativos automáticamente.                                                                                         |

## Datos preparados

**Organizaciones (7):** Demo Mascotas Bogotá y Demo Mascotas Medellín activas; Demo Refugio Huellas activo; Demo Empresa Suspendida suspendida; Demo Empresa Pendiente pendiente; Demo Refugio Rechazado rechazado; Demo Empresa Borrador en borrador. La segunda empresa también usa un perfil ficticio de Bogotá: su nombre sirve para distinguir ámbitos, no para probar geolocalización. Todas las identidades legales son ficticias.

**Catálogo e inventario:** categoría Demo Alimentos y Accesorios activa y Demo Categoría Inactiva deshabilitada; seis productos con variante COP, SKU único, imagen marcada DEMO y entrada de 30 unidades auditada:

| Producto                    | Estado inicial | SKU           | Empresa  |
| --------------------------- | -------------- | ------------- | -------- |
| Demo Alimento Adultos       | publicado      | DEMO-ALIMENTO | Bogotá   |
| Demo Arnés Pendiente        | pendiente      | DEMO-ARNES    | Bogotá   |
| Demo Cama Borrador          | borrador       | DEMO-CAMA     | Bogotá   |
| Demo Collar Rechazado       | rechazado      | DEMO-COLLAR   | Bogotá   |
| Demo Juguete Pausado        | pausado        | DEMO-JUGUETE  | Bogotá   |
| Demo Producto Empresa Ajena | borrador       | DEMO-AJENO    | Medellín |

Precio inicial por variante: 45.000 COP (`4500000` unidades menores). El alimento tiene dos unidades reservadas por pedidos mientras sus reservas están vigentes: stock físico 30, reservado 2, disponible 28. Al vencer los pedidos se liberan las reservas y el disponible vuelve a 30. Los demás productos permiten practicar edición, stock y revisión; las modificaciones de un publicado requieren nueva moderación.

**Servicios y agendas:** Demo Baño y Peluquería publicado, Demo Adiestramiento Pendiente pendiente, Demo Guardería Borrador y Demo Consulta Veterinaria publicada. Precio inicial 35.000 COP; pago presencial, sin cargo online. Tres agendas activas de citas con ventanas todos los días 08:00–18:00 en America/Bogota: una de peluquería (capacidad 2) y una por profesional (capacidad 1). Permiten probar bloqueos, horarios, capacidad y selección profesional. No se crean alojamientos ni asistencias terminadas artificialmente.

**Veterinaria:** un perfil aprobado y otro pendiente, con tres imágenes DEMO cada uno. Matrículas ficticias `990000001` y `990000002`, universidad ficticia y referencia de revisión que declara expresamente que es una fixture. La aprobación sintética vence 30 días después del seed. **No representa una comprobación oficial ni habilita a una persona real**; solo permite probar elegibilidad, privacidad y revocación local.

**Reservas:** cuatro citas para Demo Mascota Cliente, tres días después del seed, en horarios separados: solicitada, confirmada, rechazada y cancelada. La solicitud vence en 24 horas si no se decide. Puedes confirmar/rechazar la solicitada y cancelar la confirmada; inicio, finalización y no-show deben respetar las reglas temporales de la API, sin adelantar el reloj ni editar tablas.

**Refugio/adopciones:** Demo Nala con foto y publicación publicada; Demo Luna pendiente de moderación; Demo Kira en borrador. Nala tiene una solicitud aprobada de `customer` y otra en revisión de `customer.second`. La aprobación no adopta al animal: el refugio debe registrar la entrega explícita. Puedes probar contacto privado, historial, entrega y cierre de la solicitud competidora. El moderador no recibe contacto privado por su permiso de moderación.

**Pedidos/pagos:** dos pedidos de customer, uno con envío a Bogotá y otro con recogida, inicialmente `awaiting_payment`, cada uno con intento `created`. Política comercial COP habilitada, impuestos incluidos y envío de 8.000 COP. Cotizaciones y pedidos conservan la comisión de `PETTLY_COMMISSION_PERCENT` vigente al crearlos. Los pedidos/reservas de stock vencen a los 30 minutos. No se falsifica pago, captura, liquidación ni saldo; ePayco continúa deshabilitado. Puedes consultar detalles/historial, cancelar mientras corresponda y comprobar denegaciones; preparación/entrega de pedidos pagados depende de integrar la pasarela real.

**Notificaciones:** bandejas y correos reales originados por asignaciones de roles, decisiones organizativas, reservas, pedidos y adopciones; una entrega marcada expresamente como fallo sintético para probar el reintento auditado del superadmin. Esa fixture de fallo vence en 48 horas. No se interrumpe SMTP ni se simula un fallo general del worker. Las invitaciones y verificaciones se reemiten con los endpoints Auth correspondientes, no con recuperación de correos de negocio.

Los UUID, versiones iniciales, fechas exactas, permisos resueltos y el identificador de entrega fallida quedan en `tmp/demo-seed-manifest.json` tras cada ejecución. El archivo no contiene tokens ni contraseñas y está ignorado por Git. Busca nombres `Demo` en las pantallas; no necesitas memorizar los UUID.

## Recorrido recomendado

1. Entra con superadmin y revisa Usuarios: filtra por roles/estado, edita disposable, asígnale un rol, deshabilítalo y vuelve a activarlo. Usa dos navegadores/perfiles privados para comprobar revocación y versiones obsoletas. Eliminar disposable es irreversible hasta repetir el seed.
2. Revisa Organizaciones: aprueba la pendiente seleccionando applicant como responsable; corrige/reenvía la rechazada; reactiva la suspendida. Prueba equipo, cambio de roles y transferencia de responsabilidad. No elimines una entidad principal antes de recorrer sus módulos.
3. En otra sesión entra con business.admin y compara con business.operator: perfil/equipo/historial, política comercial y pagos tienen permisos diferentes. Prueba también business.other para aislamiento.
4. Gestiona productos, variantes, fotos y stock; envía un borrador/corregido a revisión. Cambia a moderator para decidir: ningún miembro puede revisar su propia empresa/refugio.
5. Modifica recursos y horarios; decide las reservas; revisa la acreditación pendiente como superadmin. Entra como su titular para comprobar documentos privados y como otro profesional para verificar la denegación.
6. Entra con shelter.admin/operator para animales y solicitudes. Revisa Luna con moderator. Confirma la entrega de Nala solo cuando quieras consumir ese escenario.
7. Consulta Pedidos/Pagos con business.admin y superadmin. Comprueba que business.operator no obtiene acceso financiero de empresa ni botones para inventar cobros.
8. Revisa inbox/preferencias. Con superadmin abre recuperación de entregas, encuentra el UUID del manifiesto, reintenta con motivo y verifica el correo en Mailpit y su auditoría.
9. Prueba Cuenta: perfil, contraseña, sesiones y cambio de correo. Cambiar una contraseña invalida la credencial inicial de esta guía para esa cuenta; repetir el seed la restaura. Para recuperación verifica el email en Mailpit. Prueba invited/unverified/disabled y confirma que los clientes siguen fuera de la gestión.

## Repetir la limpieza y el seed

```sh
# Dependencias, cliente y API compilada; infraestructura Docker local activa.
pnpm install --frozen-lockfile
pnpm db:generate
pnpm build:api
# API/worker deben estar activos y corresponder a la configuración local.
pnpm db:seed:check
pnpm db:seed:demo --reset pettly_db
```

El último comando es **destructivo para todos los datos de Pettly local**, incluyendo cuentas, sesiones, tokens, auditorías y registros de negocio. Lo ejecuta solo con destino explícito, conexión loopback a pettly_db/pettly_dev, `DATABASE_URL_DOCKER` equivalente en global_postgres, `REDIS_PREFIX=pettly:dev`, `ALLOW_INSECURE_LOCAL_DEV=true`, `NODE_ENV` distinto de production, secretos locales configurados y `PETTLY_BACKUP_KEY` de 64 caracteres hexadecimales. Las credenciales de prueba no entran en la imagen ni hay ejecución automática en arranque, migraciones, hooks o CI.

El script compara la configuración del contenedor con la del host, confirma base/usuario real sin privilegios de superusuario y exige que las tablas sean exactamente las del esquema Prisma. Pausa API/worker; crea backup cifrado en `backups/before-demo-<timestamp>.enc` y su manifiesto; trunca únicamente las tablas de negocio de Pettly y crea identidades/Argon2id dentro de una transacción. Conserva `_prisma_migrations`, esquema, índices, extensiones, constraints y triggers; no usa DROP, CASCADE ni desactiva guards. Después ejecuta el bootstrap auditado del primer superadmin y usa la API real para asignaciones y datos de negocio. La credencial y verificación inicial de las identidades son provisioning explícito de fixtures, no un registro público con privilegios.

Las sesiones temporales del generador y su login de comprobación se revocan al terminar. Los controles comprueban identidades/membresías actuales, retirada de permisos operativos para organización suspendida, aislamiento entre empresas y denegación de administración de usuarios al operador; login positivo y dos bloqueos se contrastan con HTTP real. API/worker se arrancan también si falla una etapa; ningún paso limpia Redis ni otra base. Mantén detenidos otros procesos API/worker nativos conectados a esta misma base durante el reset.

El reset inicial es transaccional; la preparación posterior mediante HTTP consta de varias transacciones y puede quedar parcial si falla. Corrige la causa y repite el comando completo: reemplaza las fixtures y genera UUID nuevos. Los límites de Auth de Redis permanecen vigentes: si la comprobación final alcanza 429 tras varias ejecuciones rápidas, espera a que venza Retry-After y repite. No borres claves para eludir límites. Tras una interrupción abrupta, comprueba que no hay otro seed activo antes de retirar `tmp/demo-seed.lock` y reintentar.

Conserva el primer backup previo al reset si quieres recuperar los datos anteriores; los siguientes contienen las fixtures de ejecuciones posteriores. La clave de cifrado sigue en la configuración local privada. Restauración/validación: [Operations](operations.md). Mailpit no se limpia: conserva correos anteriores; usa el mensaje más reciente y los tokens del seed vigente. Los UUID antiguos ya no corresponden a registros actuales.

## Verificación y límites

`pnpm db:seed:check` prueba los bloqueos del destino destructivo y coherencia de credenciales sintéticas. La ejecución del seed verifica contratos reales y permisos. Esta preparación manual autorizada es una excepción explícita a la regla de no insertar fixtures en infraestructura compartida; las suites automatizadas siguen usando PostgreSQL/Redis/Mailpit aislados. No se han cambiado módulos, DTO, permisos, Swagger ni migraciones.

Las pruebas manuales modifican datos: esta tabla describe el estado inicial, no impide los cambios que realices. Los plazos de pedidos/reservas/acreditación/entrega fallida son reales. Los recorridos de clientes todavía se prueban por Swagger hasta desarrollar Next.js/Flutter; SMS OTP sigue en pausa y pagos externos siguen pendientes. Repite el seed cuando necesites recuperar las condiciones iniciales.

Verificación ejecutada el 2026-10-11: reset/seed completo y repetición aprobados; 19 cuentas, siete organizaciones, seis productos, cuatro reservas, dos solicitudes, dos intentos de pago y una entrega fallida sintética. Se conservaron las 13 migraciones y quedaron cero sesiones activas después de la comprobación. Cuatro pruebas de protección del destino/credenciales/documentación, ESLint y formato aprobados. Chrome real verificó login, pantalla y logout de superadmin (Usuarios), business_admin (Productos), business_operator (Inventario), adoption_admin (Animales) y moderator (Catálogo). Invitación recibida en Mailpit; API, worker y admin saludables. Los demás roles/membresías, incluido multirole/adoption_operator y suspensión, fueron contrastados contra Authorization por HTTP real.
