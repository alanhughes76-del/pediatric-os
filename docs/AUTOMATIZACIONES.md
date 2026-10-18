# Automatizaciones · Pediatric OS ↔ Make

Este documento es para el Dr. Hughes. Explica qué manda Pediatric OS a Make, qué hay que cambiar en cada escenario y cómo probarlo.

- **Pediatric OS** pasa a ser la fuente de verdad.
- **Make** sigue haciendo los envíos (email, mensajes y Telegram).
- **Pediatric OS no escribe en Notion.** Durante la transición, Make puede seguir copiando a Notion a partir de los eventos.
- **Claude no tiene acceso a Make ni a Notion.** Todos los cambios de los escenarios los hacés vos.

**Estado:**
- **Etapa 8a, eventos salientes:** hecha. Es este documento.
- **Etapa 8b, endpoints entrantes:** hecha. Son Cal.com, el formulario web, Tally, Plaud, el pago por Telegram y la mensajería (sección 7).

---

## 1. Cómo llegan los eventos a Make

Llegan a un único webhook: el escenario **"Pediatric OS — eventos" (6602936)**.

**Petición:** `POST` con `Content-Type: application/json` y estos encabezados:

| Encabezado | Valor |
| --- | --- |
| `X-PediatricOS-Event` | el tipo de evento, por ejemplo `turno.confirmado` |
| `X-PediatricOS-Delivery` | el id del evento. Si llega dos veces, es el mismo envío: Make puede descartar el repetido |
| `X-PediatricOS-Signature` | `sha256=` + HMAC-SHA256 del cuerpo, en hexadecimal, con el secreto compartido |

**Cuerpo** (siempre igual):

```json
{
  "id": "Hk2…",
  "type": "turno.confirmado",
  "occurredAt": "2026-10-17T14:05:00-03:00",
  "organizationId": "…",
  "audiencia": "familia",
  "plantilla": "confirmacion_turno",
  "data": { "…": "lo propio de cada evento (ver la sección 3)" }
}
```

- **`audiencia`** dice a quién va el mensaje:
  - `familia`: Make le escribe a la familia.
  - `medico`: es un aviso para vos, por Telegram.
  - `sistema`: no se manda ningún mensaje; sirve, por ejemplo, para copiar a Notion.
- **`plantilla`** es la plantilla de mensaje que corresponde, o `null` si todavía no hay una.
  - Un mensaje que inicia tu negocio por WhatsApp necesita una plantilla aprobada por Meta.
  - Las que faltan están en la sección 4.
- **`data.destinatarios`** viene en los eventos para la familia y en tus avisos. Cada uno trae `guardianId`, `nombre`, `email`, `telefono` (en E.164: `+549…`) y `preferencia` (`llamada` o `email`).
  - En tus avisos sirve para que el **puente Telegram → familia** sepa a quién responder.
- **`data.pacientes`** es una lista de `{ patientId, nombre }`, con el nombre de pila del chico.
- **Nada clínico:** ningún evento lleva información clínica.
  - La única excepción es `resumen.envio_aprobado`, que lleva el resumen que vos aprobaste.
  - Tampoco viajan nombres de vacunas, de estudios ni temperaturas: el detalle se ve en la app.

### Verificar la firma en Make

1. En el escenario, después del webhook, agregá un módulo **Tools › Set variable**.
2. Calculá `sha256=` + `sha256(cuerpo crudo; secreto)`. Es la función `sha256` con HMAC de Make, sobre el cuerpo tal cual llegó.
3. Agregá un **filtro**: si el valor calculado no es igual al encabezado `X-PediatricOS-Signature`, el escenario se corta.
4. Para tener el cuerpo crudo, en el webhook activá "Get request headers" y "JSON pass-through".

### Reintentos y estados (los ves en Configuración › Automatizaciones)

| Estado | Qué significa |
| --- | --- |
| `pendiente` | Recién creado; se manda enseguida |
| `enviado` | Make respondió 2xx |
| `reintentar` | Falló; se reintenta a los 1, 2, 4, 8… minutos, con un tope de 6 horas |
| `fallido` | Falló 8 veces. No se reintenta más y lo ves en Configuración |
| `sin_destino` | Falta configurar la URL del webhook: **no se simula ningún envío** |
| `apagado` | Apagaste ese evento en Configuración: queda registrado y no sale |

Make tiene que responder **2xx** apenas recibe el evento. Si responde otra cosa, Pediatric OS reintenta.

### Conectar (cuando exista el proyecto real "pediatric-os")

1. **URL del webhook:** en `functions/.env.pediatric-os`, poné `MAKE_WEBHOOK_URL=<URL del webhook de "Pediatric OS — eventos">`.
2. **Secreto compartido:** cargalo con `firebase functions:secrets:set MAKE_WEBHOOK_SECRET`.
   - Elegí uno largo y al azar, y pegá el mismo en Make.
   - Nunca va en la app.
3. **Organización:** `ORGANIZACION_ID` tiene que ser la de tu organización, porque la usan los avisos programados.
4. **Despliegue:** desplegá las Functions.
5. **Prueba:** en Configuración › Automatizaciones, los eventos nuevos tienen que pasar a "Enviado".

---

## 2. Avisos programados (la lógica de plazos vive en Pediatric OS)

| Cuándo | Evento | Regla |
| --- | --- | --- |
| Cada hora | `turno.recordatorio_24h` | Turno **confirmado** que empieza dentro de 23 a 25 horas. Uno por turno y horario |
| Todos los días a las 8 (hora de Argentina) | `seguimiento.vencido` | Seguimiento pendiente con la fecha pasada. Uno por seguimiento |
|  | `vacuna.proxima` | Dosis pendiente que vence en 14 días. **Solo con el calendario verificado.** Uno por dosis |
|  | `vacuna.atrasada` | Dosis pendiente ya vencida. **Solo con el calendario verificado.** Uno por dosis |
|  | `estudio.revisar_resultado` | Estudio sin revisar cuya fecha de "Revisar resultado el" llegó |
|  | `membresia.por_renovar` | Membresía activa que se renueva en 30 días o menos. Un aviso entre los 30 y los 11 días, y otro desde los 10 |
|  | `pago.vencido` | La membresía más nueva de la familia lleva 15 días vencida, no está cancelada y no tiene ningún pago confirmado desde la renovación |
|  | `control.proximo` | Ítem "control" del plan de cuidado con fecha en los próximos 7 días |

Cada aviso sale **una sola vez**: el id del evento es fijo (tipo + clave). Con eso, los escenarios de Make que hoy calculan plazos ya no hace falta que lo hagan.

---

## 3. Eventos, escenario por escenario

En cada caso: el payload (`data`), qué cambiar en Make y cómo probarlo. Las fechas y horas van en hora de Argentina (`-03:00`).

### Cal.com → Notion — Nueva visita (4734293) · `turno.confirmado`

```json
"data": {
  "appointmentId": "t…", "familyId": "f…", "patientIds": ["p…"], "tipoVisita": "control",
  "start": "2026-10-20T10:00:00-03:00", "durationMin": 45, "modality": "domicilio",
  "pacientes": [{ "patientId": "p…", "nombre": "Tomás" }],
  "destinatarios": [{ "guardianId": "g…", "nombre": "Lucía", "email": "…", "telefono": "+549…", "preferencia": "email" }]
}
```

- **Plantilla:** `confirmacion_turno`.
- **Qué cambiar:**
  - La confirmación a la familia deja de salir de la reserva de Cal.com: sale de este evento, cuando vos confirmás el turno.
  - La reserva de Cal.com entra a Pediatric OS como "solicitado" (endpoint de la Etapa 3; en la 8b se suma la cancelación).
  - En el escenario, la rama de WhatsApp y email pasa a colgar del webhook de eventos con el filtro `type = turno.confirmado`.
- **No viaja la dirección:** la familia ya la conoce. Si la querés en el mensaje, avisame.
- **Cómo probar:** confirmá un turno en la Agenda y mirá que llegue el evento con `plantilla = confirmacion_turno`.

Los otros eventos de turnos tienen el mismo `data`:
- **`turno.solicitado`** (aviso para vos): una familia pidió una visita por el portal o por Cal.com.
- **`turno.reprogramado`** y **`turno.cancelado`** (para la familia): todavía sin plantilla.
- **`turno.en_camino`** (para la familia): lo dispara "Estoy en camino" en el turno. Reemplaza al escenario **Estoy en camino (4824303)**, hoy apagado.
  - Plantilla: a definir.

### Recordatorio 24hs antes — Email (4741361) · `turno.recordatorio_24h`

- **`data`:** el mismo que `turno.confirmado`, con destinatarios y chicos.
- **Plantilla:** a definir.
- **Qué cambiar:** el escenario deja de buscar en Notion qué turnos son mañana. Cuelga del webhook con el filtro `type = turno.recordatorio_24h`.
- **Cómo probar:** confirmá un turno para mañana a esta misma hora. Dentro de la hora aparece el evento, una sola vez.

### Recordatorio Control y Seguimiento (4805685) · `control.proximo`

```json
"data": { "carePlanItemId": "…", "patientId": "p…", "targetDate": "2026-10-24", "pacientes": [ … ], "destinatarios": [ … ] }
```

- **Qué incluye:** solo los ítems del plan de cuidado de categoría **control**, sin la descripción (puede ser clínica).
- **Plantilla:** a definir.
- **Cómo probar:** cargá en el plan de cuidado un control para dentro de 3 días. Al día siguiente a las 8 sale el evento.

### Membresía — Bienvenida (6221828) · `membresia.alta`

```json
"data": { "membershipId": "…", "familyId": "f…", "patientIds": ["p…"], "plan": "anual", "renewalDate": "2027-10-17", "pacientes": [ … ], "destinatarios": [ … ] }
```

- **Cuándo sale:** cuando se carga la **primera** membresía activa de una familia. Las renovaciones no repiten la bienvenida.
- **Plantilla:** `bienvenida_membresia`. La variable 1 es el nombre del contacto, de `destinatarios[0].nombre`.
- **Qué cambiar:** el disparador pasa a ser este evento, en lugar de "familia nueva en Notion". Antes hay que crear la plantilla en Twilio y que la apruebe Meta (texto del 13/10).
- **Cómo probar:** en una familia sin membresía, "+ Cargar membresía". Sale el evento.

### Membresía — Aviso de renovación (6221911) · `membresia.por_renovar`

```json
"data": { "membershipId": "…", "familyId": "f…", "patientIds": [ … ], "renewalDate": "2026-11-16", "diasRestantes": 30, "pacientes": [ … ], "destinatarios": [ … ] }
```

- **Plantilla:** `aviso_renovacion_membresia`.
  - Variable 1: `destinatarios[0].nombre`.
  - Variable 2: `renewalDate` en formato dd/mm/aaaa.
- **Qué cambiar:** el escenario deja de calcular plazos (que sea a 30 días o menos, que se repita a los 20). Pediatric OS ya lo manda a tiempo.
- **Cómo probar:** cargá una membresía que se renueve dentro de 20 días. Al día siguiente a las 8 sale el evento.

### Membresía — Seguimiento de pagos vencidos (6266953) · `pago.vencido` (aviso para vos)

```json
"data": { "membershipId": "…", "familyId": "f…", "renewalDate": "2026-10-01", "diasVencida": 16, "destinatarios": [ … ] }
```

- **Qué cambiar:** el escenario deja de buscar en Notion. Cuelga del webhook con el filtro `type = pago.vencido` y te avisa por Telegram.
- **Cómo probar:** una membresía con la renovación de hace 16 días y sin pagos posteriores.

### Membresía — Reporte mensual (6266921)

Lo reemplaza el módulo **Reportes** de Pediatric OS. Podés apagar el escenario. Si querés el resumen por Telegram, avisame y sumo un evento mensual.

### Plaud → Envío aprobado — Email y WhatsApp (5860040) · `resumen.envio_aprobado`

Es **el único evento con texto clínico**: el resumen que vos revisaste.

```json
"data": {
  "patientId": "p…", "noteId": "n…", "communicationId": "…", "familyId": "f…",
  "destinatarios": [{ "guardianId": "g…", "nombre": "Lucía", "email": "…" }],
  "asunto": "Resumen de la visita de Tomás", "texto": "…",
  "pacientes": [ … ]
}
```

- **Plantilla:** `resumen_visita`.
- **Qué cambiar:** el disparador deja de ser "aprobado en Notion" y pasa a ser este evento. El texto ya viene armado.
- **Cómo probar:** aprobá una nota, tocá "Preparar el mail" y después "Revisé y lo mando".

### Visitas — Documentos automáticos (6268024) · `certificado.emitido`

```json
"data": { "patientId": "p…", "certificateId": "…", "documentId": "…", "titulo": "Certificado de aptitud física", "pdfUrl": "https://…", "pacientes": [ … ], "destinatarios": [ … ] }
```

- **El PDF:** va **como adjunto de mail, nunca por mensaje**.
  - `pdfUrl` es un enlace firmado que vale **3 días**: Make lo baja y lo adjunta.
  - En el emulador viene `null`.
- **Qué cambiar:** el armado en Google Docs ya no hace falta, porque el PDF lo arma Pediatric OS. El escenario solo manda el mail.
- **Cómo probar:** emití un certificado y revisá el mail.

### Visitas — Recordatorio de estudios pendientes (6269428) · `estudio.revisar_resultado` (aviso para vos)

```json
"data": { "studyId": "…", "patientId": "p…", "reviewDate": "2026-10-17", "estado": "resultado", "pacientes": [ … ], "destinatarios": [ … ] }
```

- **Sin el nombre del estudio:** lo ves en la app.
- **Qué cambiar:** el escenario cuelga del webhook con este filtro, en lugar de recorrer Notion cada día.

### Vacunas — Alta automática (5836968) y Aviso diario (5837079) · `vacuna.proxima` / `vacuna.atrasada`

```json
"data": { "doseId": "…", "patientId": "p…", "dueDate": "2026-10-25", "pacientes": [ … ], "destinatarios": [ … ] }
```

- **Solo salen con el calendario de vacunas verificado.** Hoy está como borrador: no sale ninguno.
- **Sin el nombre de la vacuna:** el mensaje puede decir "le toca una vacuna a Tomás el 25/10".
- **Alta automática:** el esquema lo arma Pediatric OS. Ese escenario se puede borrar.
- **Plantillas:** a definir.

### Seguimientos · `seguimiento.creado` y `seguimiento.vencido` (avisos para vos)

- **`seguimiento.creado`:** sale cuando aprobás una nota con seguimiento. Trae `followUpId` y `patientId`.
- **`seguimiento.vencido`:** trae `followUpId`, `patientId` y `dueAt`.
- **Contacto:** los dos traen los destinatarios, para responder por el puente.

### Avisos para vos que antes no existían

- **`familia.datos_actualizados`:** una familia cambió su teléfono, email, preferencia o direcciones.
  - Trae `guardianId`, `familyId` y `campos`, por ejemplo `["phone"]`, más los destinatarios.
  - Los datos viejos no viajan.
- **`fiebre.registro_nuevo`:** la familia anotó algo en el registro de fiebre.
  - Trae `patientId`, `feverId`, `tipo` (`toma` o `antitermico`) y `at`.
  - **Sin la temperatura:** la ves en la app.

### Sincronización (sin mensajes)

- **`paciente.creado`:** `patientId`, `familyId` y `scope`.
- **`familia.creada`:** `familyId`, `nombre` y `zona`.
- **`nota.aprobada`:** `patientId` y `noteId`. Sin contenido clínico.

Sirven para que Make siga copiando a Notion durante la transición.

### `material.enviado`

```json
"data": { "deliveryId": "…", "patientId": "p…", "familyId": "f…", "materialId": "…", "titulo": "Sueño seguro", "pacientes": [ … ], "destinatarios": [ … ] }
```

Las comunicaciones educativas las va a manejar tu agente aparte: este evento queda disponible si lo querés usar.

### Escenarios que siguen como están en Make

- **Número de avisos — respuesta y aviso a Telegram (6269526).**
- **Puente Telegram → familia (6276487).** Los avisos para vos ya traen el teléfono de la familia en E.164.
- **Tally — Feedback del servicio (6281896).**
- **OSDE — Turno reservado (6591381).**

### Backup semanal — Notion (6268809)

Lo reemplaza la copia de seguridad de Firestore, que se configura al crear el proyecto real (Etapa 10).

---

## 4. Plantillas de mensaje

| Plantilla | Evento | Estado |
| --- | --- | --- |
| `confirmacion_turno` | `turno.confirmado` | Existe en el escenario de Cal.com |
| `resumen_visita` | `resumen.envio_aprobado` | Existe |
| `bienvenida_membresia` | `membresia.alta` | Texto redactado el 13/10. Falta crearla en Twilio y la aprobación de Meta |
| `aviso_renovacion_membresia` | `membresia.por_renovar` | Igual que la anterior |
| A definir | `turno.recordatorio_24h`, `turno.reprogramado`, `turno.cancelado`, `turno.en_camino`, `control.proximo`, `vacuna.proxima`, `vacuna.atrasada` | Hasta que existan, el evento sale con `plantilla: null`. Make puede mandar solo email o no mandar nada |

Cuando nombres una plantilla nueva, decímela y la agrego al catálogo (`shared/eventos.ts`).

---

## 5. Prender y apagar eventos

En **Configuración › Automatizaciones** podés apagar cualquier evento. Un evento apagado:
- queda registrado con el estado "Apagado";
- no sale hacia Make;
- no se manda después, aunque lo vuelvas a prender.

Sirve para ir conectando los escenarios de a uno.

## 6. Cómo probar sin Make (en la computadora)

1. Levantá los emuladores y cargá los datos de prueba: `npm run emuladores` y `npm run sembrar`.
2. Hacé la acción en la app, por ejemplo confirmar un turno.
3. En la interfaz de los emuladores (http://127.0.0.1:4000 › Firestore › `organizations/…/outbox`), mirá el evento: tipo, audiencia, plantilla y `data`.
4. Como no hay URL configurada, queda `sin_destino`: no se simula ningún envío.
5. Las pruebas automáticas están en `tests/integracion/eventos.test.ts` y `tests/funciones/programados.test.ts`.

---

## 7. Lo que entra desde Make (endpoints)

### 7.1 Cómo se manda

Todo, menos Cal.com, entra por **un solo endpoint**: `POST https://southamerica-east1-<proyecto>.cloudfunctions.net/entradaMake`.

**Firma:** encabezado `X-PediatricOS-Signature: sha256=<HMAC-SHA256 del cuerpo>`, con **el mismo secreto compartido** de los eventos (`MAKE_WEBHOOK_SECRET`). En Make, con un módulo HTTP: armá el cuerpo como texto, calculá `sha256(cuerpo; ; secreto)` y mandalo en el encabezado.

**Cuerpo:**

```json
{ "tipo": "telegram.pago", "id": "<id único del envío>", "datos": { "…": "lo propio de cada tipo" } }
```

**El `id` hace que nada se duplique.** Usá el id de la ejecución o del mensaje original (por ejemplo, el `message_id` de Telegram). Si Make reintenta con el mismo `tipo` + `id`, Pediatric OS responde `{"ok": true, "repetido": true}` y no hace nada.

**Respuestas:**

| Código | Qué significa |
| --- | --- |
| `200` | Procesado. El JSON trae `resultado` y los ids creados |
| `401` | Firma inválida |
| `400` | Tipo desconocido o falta el `id` |
| `422` | Faltan datos. El JSON trae un `error` en palabras, para responderte por Telegram |
| `503` | Falta configurar el endpoint (secreto u organización) |

**Nada se aprueba solo.** Lo que necesita criterio te deja un aviso en Pediatric OS (Avisos).

**Privacidad:**
- Lo que puede ser de salud lo ve **solo el médico**: el mensaje y las respuestas de los formularios, el triage y las transcripciones.
- El asistente ve el contacto de los interesados.
- Nada de esto va a los registros técnicos.

### 7.2 Cal.com → Notion — Nueva visita (4734293) · endpoint propio de Cal.com

**Ya funciona desde la Etapa 3:** `POST …/reservaCalcom`, con la firma de Cal.com (`X-Cal-Signature-256` y el secreto `CALCOM_WEBHOOK_SECRET`). Cubre:

- **Reserva** (`BOOKING_CREATED`): crea un turno "solicitado" que confirmás vos. Si el DNI coincide con un paciente, queda vinculado; si no, queda "familia por identificar".
- **Reprogramación** (`BOOKING_RESCHEDULED`): cancela la reserva anterior y crea la nueva.
- **Cancelación** (`BOOKING_CANCELLED`): cancela el turno.

**Qué cambiar:**
1. En Cal.com, agregá el webhook apuntando a `reservaCalcom`, con los tres eventos.
2. En Make, el escenario deja de crear la visita en Notion. La confirmación a la familia sale del evento `turno.confirmado` (sección 3).

**Cómo probar:** hacé una reserva de prueba en Cal.com y fijate que aparezca en la Agenda como "Solicitado".

### 7.3 Integration Webhooks (4405193) · `formulario.web`

```json
"datos": { "nombre": "Laura Pérez", "email": "laura@…", "telefono": "11 5555-0000", "mensaje": "…", "zona": "Olivos" }
```

**Qué pasa:**
- Si el email o el teléfono es de un adulto ya cargado: no se crea nada nuevo. Te llega un aviso y queda registrado en Comunicaciones (`resultado: familia_existente`).
- Si es un contacto nuevo: se crea un **interesado** (en Familias › Interesados) y te llega un aviso. El mensaje se guarda aparte y lo ves solo vos. Con "Crear la familia", los datos pasan precargados.
- Hace falta un email o un teléfono válido; si no, la respuesta es `422`.

**Qué cambiar:** el escenario manda el formulario a `entradaMake` con `tipo: formulario.web`, en lugar de crear la familia en Notion. La respuesta automática a la familia puede seguir en Make.

**Cómo probar:** completá el formulario de la landing con datos ficticios. Tiene que aparecer en Interesados.

### 7.4 Tally — admisión · `tally.admision`

Igual que el formulario web. Además, las respuestas van como lista:

```json
"datos": { "nombre": "…", "email": "…", "telefono": "…", "respuestas": [{ "pregunta": "¿Edad del bebé?", "respuesta": "2 meses" }] }
```

### 7.5 Tally — Triage de urgencia (6281894) · `tally.triage_urgencia`

```json
"datos": { "email": "…", "telefono": "…", "nombre": "…", "respuestas": [{ "pregunta": "¿Cuánta fiebre?", "respuesta": "39" }] }
```

**Qué pasa:**
- Se adjunta a la **solicitud de urgencia** de esa familia, o de ese contacto si todavía no está cargado, que esté dentro de las 24 horas.
- Lo ves **solo vos**, en el turno y en Avisos.
- Si no hay una solicitud de urgencia, queda igual en Avisos (`resultado: sin_solicitud`).

**Qué cambiar:** además del aviso por Telegram que ya tenés, el escenario manda las respuestas a `entradaMake`.

### 7.6 Tally — Feedback del servicio (6281896) · `tally.feedback` (opcional)

```json
"datos": { "email": "…", "puntaje": 9 }
```

Queda registrado en Comunicaciones, sin el texto. El aviso a vos sigue en Make.

### 7.7 Plaud → Notion — Resumen de visita (5859789) · `plaud.transcripcion`

```json
"datos": { "texto": "<transcripción completa>", "fecha": "2026-10-16T10:00:00-03:00" }
```

**Qué pasa:** se crea un **borrador** que ves en Avisos ("Transcripción de Plaud para revisar"). Nada se aprueba solo.

**El paciente:**
- Se **sugiere** por la fecha de nacimiento que dictes ("nació el 12/05/2023" o "12 de mayo de 2023").
- Si coinciden varios o ninguno, lo elegís vos.

**La consulta:** elegís la de ese día o una nueva.

**Lo que hace "Pasar a la consulta":**
- deja la transcripción como **texto original de la consulta**;
- abre la consulta, donde escribís y aprobás la nota como siempre.

**Las medidas dictadas:**
- Ejemplos que reconoce: "peso 12,5 kg", "talla 88 cm", "PC 47".
- Aparecen con **"Usar estos valores"** o **"Descartar"**; tenés que elegir una antes de pasar.
- Solo se proponen valores posibles para un chico. Si algo no se entiende, no se propone.

**Qué cambiar:** el escenario deja de crear la nota en Notion y manda la transcripción a `entradaMake`. Como `id`, usá el id de la grabación de Plaud.

**Cómo probar:** dictá en una grabación de prueba "nació el …, peso …, talla …" con datos ficticios.

### 7.8 Bot de pagos en Telegram · `telegram.pago`

```json
"datos": { "texto": "pago 150.000 transferencia Ruiz" }
```

**Qué pasa:** el pago queda **"a confirmar"** en Membresías y pagos, con un aviso. Lo confirmás o lo archivás.

**Cómo lee el mensaje:**
- **Monto:** el primer número ("150.000", "150000" o "2.000,50").
- **Moneda:** "usd", "dólares" o "u$s" es dólares; "pesos", "ars" o "$" es pesos. Si no lo dijiste, se propone pesos.
- **Medio:** "efectivo", "transferencia" o "mp"/"mercado pago". Si no lo dijiste, se propone transferencia.
- **Familia:** por el apellido, solo si coincide **una sola** familia. Si no, la elegís al confirmar.

**Si Make ya separó los datos,** podés mandarlos así: `"monto": 150000, "moneda": "ARS", "medio": "efectivo"`.

**La respuesta para tu Telegram:**
- Si salió bien: `{"resultado": "a_confirmar", "familia": "Familia Ruiz" | null, "monto": 150000, "moneda": "ARS"}`.
- Sin monto: `422`, con el error "No entendí el monto…".

**Qué cambiar:** el bot deja de escribir en Notion y manda el texto a `entradaMake`. Como `id`, usá el `message_id` de Telegram.

### 7.9 Estado de entrega · `mensajeria.estado`

```json
"datos": { "eventId": "<el X-PediatricOS-Delivery del evento>", "estado": "entregado", "canal": "email" }
```

**Estados que entiende:** `entregado`/`delivered`/`read`, `fallido`/`failed`/`undelivered` y `enviado`/`sent`.

**Qué pasa:** queda registrado en **Comunicaciones**. En el resumen de la visita, se actualiza su propio registro.

**Qué cambiar:** al final de cada escenario que envía algo, sumá un paso que informe el resultado.

### 7.10 Número de avisos (6269526) · `mensajeria.entrante` (opcional)

```json
"datos": { "telefono": "+549…", "canal": "…" }
```

**Qué pasa:**
- Queda en **Comunicaciones** como entrante, **sin el texto** del mensaje.
- Si el número es de un adulto cargado, queda vinculado a su familia.

El bot de preguntas frecuentes sigue en Make.

