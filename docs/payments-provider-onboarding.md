# Activación de pagos de Pettly con ePayco

Estado: consulta preparada; no enviada. Fecha: 2026-10-09. El núcleo de Payments está implementado; la integración externa y los cobros todavía no están habilitados. Ver [Payments](payments.md).

## Paso manual del titular

Crear y verificar una cuenta en el [dashboard oficial de ePayco](https://dashboard.epayco.com/) con la identidad del titular real de Pettly y la documentación bancaria/tributaria que solicite el proveedor. Solicitar habilitación de marketplace y pagos divididos; la documentación exige activación de la cuenta principal y registro de receptores. No contratar condiciones basándose solo en tarifas generales.

Las credenciales de prueba se configurarán como secretos del backend mediante variables de entorno; no incluirlas en este documento, Git ni mensajes de soporte. Los datos bancarios y documentos de identidad deben entregarse mediante los canales oficiales del proveedor.

## Texto para enviar a soporte o al asesor comercial

Asunto: Habilitación de marketplace con split y Smart Checkout — Pettly Colombia

Hola, estamos desarrollando Pettly, un marketplace colombiano de productos y servicios para mascotas. Inicialmente cada pedido corresponde a un solo vendedor y todos los cobros serán en COP. Necesitamos que ePayco gestione el recaudo y divida cada pago entre el vendedor y la comisión de Pettly, bajo el modelo agregador.

La integración será mediante sesiones de Smart Checkout creadas en nuestro backend NestJS; el cliente utilizará el checkout de ePayco. Inicialmente nos interesan tarjetas y PSE. Antes de contratar y habilitar cobros, agradeceríamos confirmar por escrito:

1. Disponibilidad de este modelo para Pettly, requisitos del titular, activación de split, entorno de pruebas y documentación vigente de la integración.
2. Alta y verificación de vendedores/receptores: documentos requeridos, estados de aprobación, identificadores, API disponible y responsabilidades de cada parte.
3. Compatibilidad de split con tarjetas y PSE en Smart Checkout. Semántica exacta de porcentajes/importes, bases fiscales y asignación de la tarifa de procesamiento entre receptores.
4. Cotización completa: porcentaje y cargo fijo por transacción, IVA, cargos adicionales por split/receptor, retiros, mínimos, retenciones y diferencias por banco de destino.
5. Plazos de liquidación para Pettly y vendedores, calendario y estados consultables. ¿Existe retención y liberación tras entrega? Si existe, ¿qué condiciones y costes tiene?
6. Reembolsos completos y parciales para cada método: reversión de ambas partes del split, devolución de tarifas, fondos ya distribuidos, saldo insuficiente, contracargos y costes/responsabilidades.
7. Vencimiento de sesiones y pagos pendientes PSE, cancelación de intentos, pagos aprobados tarde y procedimientos de devolución cuando un pedido ya perdió su reserva de inventario.
8. Webhooks, cobertura de firmas, consulta autoritativa de estado, reintentos, idempotencia y reportes de conciliación por pedido y receptor.

Por favor, indiquen también las condiciones contractuales y de facturación aplicables al modelo de intermediación y comisión de Pettly.

Gracias.

## Después de recibir la respuesta

Registrar las condiciones confirmadas en payments.md, definir la política de comisión con el titular y validar el tratamiento fiscal con un contador colombiano. Implementar y probar en sandbox cobros, estados pendientes, eventos repetidos, conciliación y devoluciones antes de activar credenciales de producción.
