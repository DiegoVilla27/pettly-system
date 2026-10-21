# Fuente de negocio de Pettly

Copia de lectura del original `negocio.docx`, descargado de Google Drive el 2026-10-08.

Fuente: https://docs.google.com/document/d/1TrjYaHWOvsY3xOU2igPsLTBaOUUlsjMS/edit

Última modificación de la fuente: 2026-10-08T17:12:20.304Z. Los DOCX conservan el original; esta copia extrae el texto en orden y no reproduce su formato. Las propuestas de la fuente siguen pendientes donde no exista una decisión aprobada en `DESIGN.md`.

Documento de negocio de la plataforma XXXXXX
CABUWEB | Proyecto XXXXXX
Versión 2.0 propuesta para revisión | 8 de octubre de 2026
1 Visión y propósito
Resumen ejecutivo
XXXXX es una propuesta de plataforma web y móvil para el mercado colombiano que conecta clientes con empresas del sector animal y entidades que publican animales en adopción. Integra catálogo y compra de productos, búsqueda y reserva de servicios y contacto para adopciones responsables.
El propósito es reducir la dispersión de la oferta y facilitar transacciones con información clara, trazabilidad y mecanismos de atención. La viabilidad comercial debe validarse con un piloto antes de ampliar cobertura o invertir en toda la infraestructura prevista.
Problema y propuesta de valor
El proyecto parte de la hipótesis de que los usuarios encuentran productos, servicios y oportunidades de adopción en canales fragmentados, con información desigual sobre disponibilidad, condiciones y proveedores. Esta hipótesis requiere entrevistas y evidencia del mercado; no se dispone de cifras que acrediten tamaño, crecimiento o demanda.
Para los clientes, la propuesta consiste en comparar oferta y realizar gestiones desde un mismo entorno. Para las empresas, ofrece publicación y gestión de pedidos y reservas. Para refugios y entidades de adopción, aporta visibilidad y seguimiento de solicitudes hasta el contacto inicial.
Objetivos y destinatarios
El objetivo general es desarrollar y validar una plataforma que reúna comercio, servicios y adopciones con roles diferenciados. Los objetivos específicos son gestionar catálogos, habilitar reservas, facilitar solicitudes de adopción, controlar permisos y proporcionar herramientas operativas a empresas y administración.
Este documento orienta al Product Owner, equipo de producto, empresas participantes y responsables de operación. Las ampliaciones de alcance, métricas y opciones comerciales aquí descritas son propuestas pendientes de aprobación. El documento técnico complementario define cómo verificarlas e implementarlas.
2 Usuarios y alcance
Participantes y responsabilidades
Cliente: consulta oferta, compra, reserva y solicita contacto para adopción; mantiene información de contacto actualizada. Empresa: publica información veraz, mantiene inventario y disponibilidad y atiende pedidos, cancelaciones y reclamaciones. Entidad de adopción: documenta animales y evalúa solicitudes conforme a su proceso.
Administración: valida altas y publicaciones según una política definida, modera contenido, gestiona incidencias y configura la plataforma. Product Owner: prioriza el alcance y acepta entregables. Los refugios son participantes diferenciados; sus permisos no deben confundirse con los de vendedores comerciales.
Producto completo y primera entrega
La visión original contempla web pública, panel de empresas, panel general y aplicación móvil. Para el MVP se propone una web adaptable a móviles con los tres módulos principales y paneles básicos. La aplicación Flutter se conserva en la hoja de ruta y su desarrollo se decide tras validar uso y presupuesto.
El piloto debe limitarse a una zona geográfica y a un conjunto controlado de proveedores. Ciudad, categorías, número de participantes, duración, presupuesto y responsables están por definir. La ubicación histórica del proyecto en Armenia, Quindío, no constituye una decisión sobre el lugar del piloto.
Funciones propuestas para el MVP
Identidad y roles; catálogo por categorías con filtros; detalle de producto y proveedor; carrito de una sola empresa; pedido y pago mediante una pasarela; consulta del estado del pedido; reservas según disponibilidad; publicaciones y solicitudes de adopción; paneles para gestión; moderación y atención de incidencias.
Se propone limitar cada pedido a una empresa para simplificar entregas, devoluciones y conciliación. Esta regla requiere aceptación del Product Owner. El sistema debe informar la restricción antes de cambiar de vendedor.
Fuera de la primera entrega
Integraciones con sistemas oficiales de veterinarias; seguimiento postadopción sistemático; reparto propio; carrito con múltiples vendedores; pagos divididos automáticos; suscripciones recurrentes; recomendaciones mediante inteligencia artificial y expansión internacional. La atención veterinaria como categoría exige validación adicional antes de habilitarse.
3 Flujos y reglas de negocio
Compra y cumplimiento
El cliente selecciona productos, confirma dirección, cobertura, costos y condiciones y crea el pedido. El pago aprobado por la pasarela habilita el cumplimiento. La empresa informa preparación, despacho y entrega. La plataforma conserva eventos y facilita consultas o reclamaciones.
La disponibilidad debe comprobarse al confirmar; no se aceptan existencias negativas. Los importes, moneda, descuentos y costos de entrega se calculan en servidor y se fijan en el pedido. Una respuesta del navegador no acredita el pago. El estado se confirma mediante comunicación verificable de la pasarela.
Cada empresa debe definir zonas de entrega, plazos, costos y procedimientos de devolución. Debe acordarse quién cobra, factura, entrega y responde frente al cliente antes de permitir operaciones reales.
Reservas de servicios
El cliente elige servicio, lugar, fecha y horario disponible. El sistema solicita o confirma la reserva conforme al modo del proveedor y comunica su estado. La empresa administra agenda y capacidad. No pueden confirmarse reservas incompatibles sobre el mismo recurso.
La ficha debe mostrar duración, precio, requisitos, cobertura y política de cancelación. Se propone iniciar con pago directo al proveedor, informado expresamente, y evaluar el prepago después del piloto. Esta propuesta no establece una obligación comercial definitiva.
Adopción responsable
La entidad publica ficha con fotos, especie, edad aproximada, ubicación, necesidades y condiciones de adopción. El interesado envía una solicitud y autoriza compartir los datos necesarios. La entidad revisa y coordina el contacto.
La adopción se gestiona de forma separada de las ventas y no incorpora checkout ni comisión por animal. La plataforma no asegura aprobación ni resultados sanitarios. La verificación de entidades, la moderación y un canal para reportes deben formar parte de la operación.
El alcance termina en la gestión de la solicitud y el contacto inicial. Un seguimiento posterior sería una ampliación del producto, que requiere responsables y consentimiento definidos. La entidad puede mantener su propio proceso fuera de la plataforma.
4 Modelo comercial y operación
Opciones de monetización
El documento original no define ingresos. Se propone evaluar comisión sobre pedidos completados, planes de herramientas para empresas y espacios promocionales identificados como publicidad. Ninguna tarifa, porcentaje o combinación se considera aprobada.
La selección debe considerar margen de los proveedores, costo de pagos, soporte, devoluciones, adquisición y disposición a pagar. No se cobrará por adopciones como propuesta de producto; cualquier patrocinio debe distinguirse de la evaluación de adoptantes.
Economía del piloto
Medir margen de contribución por pedido: ingreso de la plataforma menos costos variables de pasarela asumidos, soporte, promociones y pérdidas atribuibles. El volumen vendido por empresas no equivale a ingresos de la plataforma.
Estimar por separado desarrollo, infraestructura, herramientas, verificación, asesoría jurídica, marketing y operación. Preparar escenarios conservador, base y favorable con supuestos explícitos. Sin estos datos no es posible fijar rentabilidad ni fecha de equilibrio.
Captación y lanzamiento
La estrategia inicial mantiene campañas en Instagram, TikTok y Facebook, alianzas con refugios y empresas, presencia en comercios y eventos e iniciativas con creadores del sector. Cada canal debe probarse con presupuesto limitado y medir conversiones a acciones útiles.
La secuencia propuesta es investigación con usuarios y proveedores, selección de participantes, carga y revisión de oferta, prueba operativa de pedidos y reservas, lanzamiento limitado y evaluación. La expansión depende de calidad de servicio y evidencia de demanda.
Atención y control de calidad
Definir un responsable operativo, horario de soporte, canales de contacto y criterios de escalamiento. Cada incidencia debe tener identificador, historial y resolución. El alta de una empresa no implica certificar automáticamente todos sus servicios.
Registrar documentación de proveedores según actividad; revisar productos prohibidos o restringidos; atender reportes y suspender publicaciones cuando corresponda. Definir quién aprueba reembolsos y cómo se concilian con vendedor y pasarela.
5 Requisitos y evaluación del piloto
Requisitos funcionales trazables
NEG 01 Identidad: registro, verificación, recuperación y control de acceso. NEG 02 Catálogo: categorías, búsqueda, filtros y disponibilidad. NEG 03 Comercio: pedido, pago y estados. NEG 04 Servicios: agenda, reserva y cancelación. NEG 05 Adopciones: ficha, solicitud, contacto y cierre.
NEG 06 Gestión: acceso de cada empresa únicamente a sus registros. NEG 07 Administración: moderación y configuración con auditoría. NEG 08 Atención: reportes y resolución. NEG 09 Datos: información y mecanismos para ejercer derechos sobre datos personales. Los identificadores se reutilizan en el documento técnico.
Indicadores y criterios de éxito
Medir empresas activas con oferta vigente; conversión de visitas a pedido; pedidos pagados y completados; cancelaciones; reservas atendidas; solicitudes de adopción gestionadas; tiempo de respuesta; recurrencia y margen de contribución.
Una solicitud no acredita adopción y un pago no acredita entrega. Definir denominador, período, origen de datos y responsable de cada métrica. Los umbrales de éxito se establecerán antes del piloto con datos de base, evitando fijar objetivos sin evidencia.
Condiciones de aceptación y riesgos
Antes de lanzar, deben funcionar los flujos completos, el aislamiento entre empresas, la gestión de incidencias y la conciliación de pagos. Debe haberse ensayado una restauración de datos y aprobado las condiciones comerciales y de privacidad.
Los riesgos principales son escasez de oferta o demanda, inventario desactualizado, fraude, incumplimientos, doble reserva y exposición de datos. Las medidas propuestas incluyen piloto limitado, verificación proporcional, controles de concurrencia, auditoría y procedimientos de atención.
6 Cumplimiento y decisiones pendientes
Marco de revisión jurídica
La operación debe someterse a revisión jurídica en Colombia antes del lanzamiento. La Ley 1581 de 2012 es una referencia para protección de datos personales; la Ley 1480 de 2011 y las reglas aplicables al comercio electrónico deben considerarse al definir información al consumidor y responsabilidades.
Preparar política de tratamiento, aviso de privacidad, términos de uso, condiciones de compra, cancelaciones y devoluciones, acuerdos con proveedores y procedimiento de atención. Validar bases de tratamiento, encargados, transferencias, conservación y ejercicio de derechos.
Los requisitos del ICA y de las profesiones o servicios veterinarios deben revisarse por categoría y actividad. No se presume que toda prestación veterinaria requiera una habilitación del Ministerio de Salud. La protección animal debe orientar moderación y adopciones; este documento no atribuye a la Ley 1774 una obligación específica de seguimiento postadopción.
Decisiones para aprobar el producto
El Product Owner debe resolver ciudad y categorías del piloto, canales de primera entrega, presupuesto, responsables y calendario; opción de ingresos; quién cobra y factura; política de logística; pasarela; condiciones de reservas y verificación de proveedores.
Debe aprobar también la regla de pedido de una sola empresa, el aplazamiento de Flutter, los permisos de entidades de adopción y los indicadores del piloto. Toda decisión se registrará con fecha, responsable y efecto en alcance, costo y requisitos.
Control del documento y referencias
Esta versión formaliza la visión previa y añade propuestas operativas. No acredita validación comercial, cumplimiento jurídico ni aprobación de arquitectura. Los cambios posteriores deben mantener consistencia con tecnico.docx.
Referencia de datos personales: Superintendencia de Industria y Comercio, Ley Estatutaria 1581 de 2012. https://sedeelectronica.sic.gov.co/transparencia/normativa/ley-estatutaria-1581-de-2012
Referencia para revisión de comercio electrónico: concepto SIC de 8 de junio de 2021. https://sedeelectronica.sic.gov.co/sites/default/files/boletin-juridico/boletin/docs/21-171791.pdf
