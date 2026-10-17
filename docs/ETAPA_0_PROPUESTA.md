# Etapa 0 · Exploración y propuesta

Pediatric OS · 17/10/2026 · respuesta a `docs/PROMPT_MAESTRO.md` (versión 1).

En esta etapa no se escribió código. Este documento tiene el inventario del repositorio, la propuesta técnica y las preguntas que necesito que me contestes antes de la Etapa 1.

---

## 1. Lo más importante, en pocas líneas

- **Punto de partida.** Ya existe una app Expo (SDK 57) que corre en web y en el celular, con datos de ejemplo en memoria y **sin backend**. No hay nada de Vibecode Cloud ni de Supabase que migrar. El backend con Firebase se arma desde cero.
- **Qué se reutiliza.** Se aprovechan la lógica pura, que está probada con 232 tests: percentilos, edad, búsqueda, plan por plazo, certificados y fiebre. También la mayor parte de las pantallas y el filtro de lo que ve la familia, que pasa a vivir en el servidor.
- **Qué cambia de fondo.**
  - Los datos pasan de la memoria a Firestore, con reglas de seguridad y Cloud Functions.
  - Los turnos se separan de las consultas.
  - Las vacunas pasan a tener su propio esquema.
  - El portal lee copias filtradas que arma el servidor.
- **Qué cambia en el diseño.** El sistema visual se ajusta a tu imagen y al prompt: marca "Pediatric OS", Inter, la paleta pastel con rosado y la navegación de 16 módulos.
- **Antes de empezar,** hay que resolver 7 preguntas (sección 12) e instalar Java en tu Mac, porque el emulador de Firestore lo necesita.

---

## 2. Inventario del repositorio

### 2.1 Qué hay

| Área | Estado | Comentario |
| --- | --- | --- |
| Stack | Expo SDK 57, React Native 0.86, TypeScript, Expo Router, react-native-web | La web sale del mismo código. Elegimos SDK 57 porque es el que corre el Expo Go de tu iPhone |
| Backend | ❌ No hay | Datos ficticios en memoria (`src/data/mock.ts`); se reinician al recargar |
| Autenticación | ⚠️ Simulada | Selector de rol de prueba. Enlace mágico simulado (15 min, un solo uso) en `src/lib/enlaceMagico.ts` |
| Roles y permisos | ⚠️ Solo en el cliente | `vistaFamilia.ts` filtra lo que ve cada adulto, con tests para los 36 adultos de ejemplo. El prompt pide que viva en el servidor |
| Auditoría | ⚠️ Solo en el cliente | Toda escritura suma una fila en memoria; no tiene valor anterior ni nuevo, ni el origen (persona, sistema o IA) |
| Motor de percentilos | ✅ | Módulo puro (`src/lib/percentiles.ts`) con los 6 tests obligatorios del 7.6, más L = 0, fuera de rango, prematuro y 0,7 cm |
| Crecimiento (pantalla) | ✅ | Peso, talla, PC, IMC y peso/talla; rangos 0–2, 0–5 y 2–19; P3–P97; tocar un punto; tabla; puntos huecos en prematuros; vista de familia sin Z |
| Hitos del desarrollo | ✅ | Listas por área, autoguardado, recordatorio de tamizaje y PRUNAPE |
| Edad | ✅ | Abreviada desde los 12 meses, edad corregida y aviso de fecha imposible |
| Pacientes | ✅ | Solapas por ámbito con su conteo, búsqueda sin tildes, alta con aviso de duplicado. Faltan cobertura, grupo sanguíneo y foto |
| Familias y adultos | ⚠️ | Adultos con domicilios propios, vínculos con vigencia y acceso al portal. No existe la ficha de familia del 7.3 y el teléfono no se normaliza a E.164 |
| Consulta y nota clínica | ✅ (lógica) | Antropometría en vivo, hitos, nota versionada (borrador → aprobada → reemplazada), bandera y borrador "con IA" **de ejemplo** |
| Seguimientos | ✅ | Vencen a las 24 h o 48 h; mensaje editable; copiar, ir a la consulta y marcar resuelto |
| Registro de fiebre | ✅ | Familia y médico, "¿Mejoró su ánimo?", curva con línea en 38 °C, revisado, vincular a una consulta y registro a mano |
| Certificados | ⚠️ | 4 tipos, emitir, anular y PDF al vuelo. Falta "Constancia de atención" y la redacción neutra para sexo X. El PDF no se guarda |
| Plan de cuidado | ✅ | Agrupado Hoy / 30 días / meses / Prevención. Falta la categoría "estudio" y el estado "cancelado" |
| Agenda y turnos | ❌ | Hoy un turno es una consulta "programada". No hay disponibilidad, estados, superposición ni buffer |
| Vacunas | ⚠️ | Son ítems "vacuna" del plan de cuidado. No usa `calendario_vacunas.json` |
| Medicación, estudios, prevención, comunicaciones, reportes, IA, Plaud, configuración | ❌ | Aparecen como "Próximamente" en la barra lateral |
| Membresía y pagos | ⚠️ | Hay modelo y estado (activa, por vencer, vencida). No hay pantallas de pagos ni precios configurables |
| Diseño | ⚠️ | Rediseño G–K con barra lateral, tablero y paleta pastel. Choca con el prompt en marca, tipografía, paleta y navegación (sección 9) |
| Tests | ✅ 232 | Percentilos, búsqueda, vista de familia, enlace mágico, certificados, PDF y plan por plazo. No hay tests de reglas porque no hay backend |

### 2.2 Archivos de datos

- `assets/data/oms_lms.json`, `argentina_lms.json` y `hitos_desarrollo.json` son **idénticos** a los que usa la app hoy (`src/data/referencias/`). En la Etapa 1 la app pasa a leerlos de `assets/data/` y se borra la copia (te lo pido antes).
- `assets/data/calendario_vacunas.json` es nuevo: está marcado como BORRADOR y sale del escenario de Make 5836968. No lo usé todavía.

### 2.3 Qué sirve y qué no

- **Sirve tal cual:** todo `src/lib/` (lógica pura y sus tests), los componentes de crecimiento, hitos, fiebre y certificados, y el armado responsive (barra lateral desde 1024 px).
- **Sirve con cambios:**
  - `types.ts` pasa a ser el modelo de Firestore.
  - `vistaFamilia.ts` pasa a una Cloud Function que arma las copias del portal.
  - `store.tsx` se reemplaza por una capa de acceso a datos (`src/data/`) con las mismas funciones.
- **No sirve:** el selector de rol de prueba y el enlace mágico simulado; los reemplazan Firebase Auth y una función del servidor. Quedan solo con los emuladores.

### 2.4 Lo que encontré en tu entorno

- La Firebase CLI 15.34 está instalada y con sesión iniciada. Tenés un proyecto, **"Turnos Domicilios"** (`turnos-domicilios-93139`), sin región asignada (pregunta 2).
- **No hay Java instalado.** El emulador de Firestore lo necesita (JDK 21). Tampoco está Homebrew. Te paso el paso a paso en la Etapa 1.

---

## 3. Stack propuesto

| Pieza | Elección | Por qué |
| --- | --- | --- |
| App | Expo SDK 57 + Expo Router + react-native-web | Un solo código para web y celular, como pide el prompt. No veo motivo técnico para cambiarlo |
| SDK de Firebase en la app | Firebase JS SDK (modular) | Funciona en Expo Go y en la web. React Native Firebase obliga a compilar la app y no corre en Expo Go |
| Funciones | Cloud Functions 2.ª generación, TypeScript, Node 22 | Validaciones críticas, transacciones, eventos para Make, endpoints entrantes e IA |
| Base | Cloud Firestore | Pedido del prompt |
| Archivos | Cloud Storage con enlaces firmados de vida corta | Certificados, resultados, recetas en PDF y materiales |
| Web | **Firebase Hosting** (no App Hosting) | La web de Expo se exporta como archivos estáticos. App Hosting está pensado para frameworks con servidor (Next.js, Angular). Hosting es más simple y lo permite el prompt ("o un hosting compatible") |
| Celular | EAS Build cuando haga falta. Mientras tanto, Expo Go | App Check y las notificaciones push van a requerir compilar la app; por ahora no hacen falta |
| Desarrollo | Emuladores de Firebase (Auth, Firestore, Functions, Storage) con un proyecto `demo-pediatric-os` | Con el prefijo `demo-` el emulador no puede tocar nada real |
| Tests | Jest (lógica) + `@firebase/rules-unit-testing` (reglas) + tests de Functions contra el emulador | Pedido del prompt |
| Tipografía | Inter (`@expo-google-fonts/inter`) | Pedido del prompt; reemplaza a Playfair y Source Sans |

**Plan de Firebase:** las Cloud Functions requieren el plan **Blaze** (pago por uso). Con un solo médico y decenas de familias, el consumo debería ser bajo, pero no puedo prometerte un monto. Te propongo configurar una **alerta de presupuesto** en Google Cloud desde el primer día.

---

## 4. Arquitectura

```
App (Expo: web + iOS + Android)
 ├─ src/app/          pantallas (Expo Router), una carpeta por módulo
 ├─ src/modules/      lógica de negocio por módulo (sin interfaz)
 ├─ src/data/         acceso a datos: Firestore, Storage, llamadas a Functions
 └─ src/lib/          lógica pura compartida (percentilos, edad, fechas…)
        │
        ▼  Firebase JS SDK (Auth + Firestore + Storage + Functions)
Firebase
 ├─ Auth: custom claims { rol, organizationId }
 ├─ Firestore + Security Rules  ← lecturas y escrituras simples
 ├─ Cloud Functions             ← todo lo crítico:
 │    • turnos (crear / confirmar / mover, con transacción)
 │    • aprobar y corregir notas, anular certificados
 │    • auditoría (triggers que registran antes/después)
 │    • proyección del portal (copias filtradas para la familia)
 │    • outbox → webhook de Make (HMAC, reintentos)
 │    • endpoints entrantes (Cal.com, Plaud, Telegram, Tally…)
 │    • enlace mágico, IA (Claude), tareas programadas
 └─ Storage + reglas
```

**Código compartido con las Functions.** El motor de percentilos y la lógica de edad y fechas van en un paquete puro (`shared/`), que importan tanto la app como las Functions. Así se cumple lo de "un módulo puro compartido entre web, celular y Cloud Functions".

**Cómo se protege lo que ve la familia.** Las Security Rules no pueden ocultar campos dentro de un documento: o se lee el documento entero o no se lee. Por eso:

- Los datos clínicos viven en colecciones que **solo puede leer el médico**.
- La familia lee una **proyección**: documentos separados que arma una Cloud Function cada vez que algo cambia. Por ejemplo, al aprobar una nota se copia solo el resumen para la familia. Esas copias nunca tienen hallazgos, conducta, borradores ni alergias referidas.
- Así se cumple la regla 10: el filtro está "en las Security Rules y en la forma de guardar los datos". Los tests de reglas lo prueban entrando como cada adulto de demostración.

**Auditoría.** Cada colección relevante tiene un trigger del servidor que registra quién, qué, cuándo, el valor anterior, el nuevo y el origen (persona, sistema o IA). La auditoría la escribe solo el servidor; las reglas no dejan modificarla ni borrarla desde ningún lado. Como la registra el servidor, no se puede saltear desde la interfaz.

---

## 5. Modelo de datos (Firestore)

Todo cuelga de `organizations/{orgId}` (hoy, una sola). Así el multi-consultorio futuro queda resuelto y las reglas comparan el `organizationId` del usuario con el de la ruta. Toda entidad lleva `createdAt`, `createdBy`, `updatedAt` y, en lo clínico, `archivedAt`.

**Leyenda:** M = médico · A = asistente · F = familia (solo lo suyo) · S = servidor (Cloud Functions). "Escribe S" significa que el cliente no escribe directo: llama a una función.

### 5.1 Seguridad y organización

| Colección | Lee | Escribe | Qué valida la regla |
| --- | --- | --- | --- |
| `organizations/{orgId}` | M, A | M | Solo su organización |
| `…/settings/{doc}` (agenda, links, precios, IA, vacunas, automatizaciones públicas) | M, A (sin `ia`) | M | Los secretos **no** están acá: van en Secret Manager |
| `users/{uid}` | el propio usuario, M | S | Rol y organización solo los fija el servidor (custom claims) |
| `…/professionals/{id}` | M, A | M | — |
| `…/consents/{id}` (portal, foto, grabación, IA) | M; F lo suyo | M; F acepta lo suyo | Un consentimiento no se borra: se revoca con fecha |

### 5.2 Administrativo (lo pueden leer M y A)

| Colección | Lee | Escribe | Qué valida |
| --- | --- | --- | --- |
| `…/families/{familyId}` | M, A | M, A | Estado activa o inactiva; zona |
| `…/guardians/{guardianId}` | M, A; F su propio documento | M, A; F solo teléfono, email, preferencia de contacto y direcciones | Teléfono en E.164 (`^\+549\d{10}$` para celulares de Argentina); sin email no se puede activar `portalEnabled` |
| `…/guardians/{id}/addresses/{addrId}` | M, A; F las suyas | M, A, F las suyas | — |
| `…/relationships/{relId}` (paciente ↔ adulto) | M, A | M, A | Vigencia desde y hasta; no se borra, se cierra |
| `…/patients/{patientId}` (datos administrativos: nombre, nacimiento, sexo, DNI, ámbito, cobertura, foto) | M, A | M, A (alta vía S para el control de duplicados) | Obligatorios y edad gestacional de 22 a 44 |
| `…/memberships/{id}`, `…/payments/{id}` | M, A | M, A; S crea los pagos "a confirmar" de Telegram | Montos y monedas desde Configuración |

### 5.3 Agenda (M y A)

| Colección | Qué guarda | Escribe |
| --- | --- | --- |
| `…/appointments/{id}` | Fecha, inicio, duración, tipo (control, urgencia día, urgencia noche, seguimiento, recién nacido, prenatal), modalidad, familia, `patientIds[]`, dirección de la visita (copia, no referencia), zona, motivo general, estado, origen, notas operativas | **Solo S** (crear, confirmar, mover, cancelar, ausente, en camino) |
| `…/appointments/{id}/history/{h}` | Cada cambio de estado o de horario, con antes y después | Solo S |
| `…/agendaDays/{yyyy-mm-dd}` | Los bloques ocupados del día, confirmados y con buffer (ver sección 7) | Solo S |
| `…/availabilityRules/{id}`, `…/blocks/{id}`, `…/zones/{id}` | Horarios, bloqueos y zonas | M, A |

### 5.4 Clínico (solo M; el asistente **no** lee nada de esto)

Subcolecciones de `…/clinical/{patientId}/`: `background`, `problems`, `allergies`, `consultations` (con `consultationProblems`), `notes`, `followUps`, `growth`, `milestones`, `vaccineDoses`, `medications`, `prescriptions`, `studyOrders` (con `results`), `carePlan`, `fever`, `certificates` y `documents`.

**Reglas clave:**

- **`notes/{noteId}`:**
  - Se crea y se edita solo si `status == 'borrador'`.
  - Una vez `aprobada`, ningún cliente la puede modificar.
  - Aprobar y "Corregir esta nota" pasan por una Function, que fija autor, fecha y hora, marca la anterior como `reemplazada` y crea la versión nueva, todo en una transacción.
  - Un test intenta escribir directo una nota aprobada y verifica que la regla lo rechace (prueba 7 del prompt).
- **`certificates`:** una vez emitido, solo cambia por la Function de anulación, que exige el motivo.
- **`fever`:**
  - La familia crea registros de sus hijos, con `createdBy` igual a su uid.
  - No puede editar los ajenos ni marcar "revisado".
- **Archivado:** nada clínico tiene `delete` permitido. Se archiva con `archivedAt`.

### 5.5 Portal (proyección para la familia)

`…/portal/{patientId}/` con `summaries` (resúmenes de notas aprobadas), `allergies` (solo confirmadas), `problems` (solo visibles), `plan` (pendientes), `growth`, `vaccines`, `documents` (solo los habilitados), `materials` y `fever` (espejo de la suya).

- **Lee:** el adulto con un vínculo vigente con ese paciente y con el portal habilitado. Lo verifica la regla, con un documento de acceso `…/portalAccess/{uid}` que mantiene el servidor.
- **Escribe:** solo el servidor.

### 5.6 Documentos, comunicación y trazabilidad

| Colección | Lee | Escribe |
| --- | --- | --- |
| `…/educationalMaterials`, `…/materialDeliveries` | M (A los materiales) | M |
| `…/communications` | M, A (sin texto clínico) | M, S |
| `…/notifications` (la campana) | El destinatario | S |
| `…/outbox/{eventId}` | M | S |
| `…/inbound/{eventId}` | M | S |
| `…/auditLog/{id}` | M | **Solo S, solo crear**. Ni el médico la modifica |
| `…/aiInteractions/{id}` | M | S |

**Storage:**
- Rutas: `orgs/{orgId}/patients/{patientId}/…` y `orgs/{orgId}/materials/…`.
- Las reglas copian las de Firestore.
- La descarga es siempre con URL firmada que genera una Function (unos minutos de vida). Nunca enlaces públicos permanentes.

**Índices previstos:**
- `appointments` por `date` + `status`.
- `followUps` por `status` + `dueAt`.
- `fever` por `reviewedAt` + `takenAt`.
- `outbox` por `status` + `nextAttemptAt`.
- `vaccineDoses` por `status` + `dueDate`.

El detalle completo va a `docs/MODELO_DE_DATOS.md` en la Etapa 1.

---

## 6. Autenticación y roles

- **Roles** en custom claims: `{ rol: 'medico' | 'familia' | 'asistente', organizationId }`. Los asigna solo una Function; nadie puede darse un rol desde la app. El rol de asistente queda preparado y probado aunque hoy nadie lo tenga.
- **Tu acceso:** email y contraseña más un **segundo factor con app de códigos (TOTP**, como Google Authenticator).
  - Firebase lo ofrece con la mejora gratuita a Identity Platform. Hay que activarla en la consola y requiere el plan Blaze.
  - Es la opción más segura sin costo por mensaje. El SMS se paga por envío y es más vulnerable.
  - Los precios y el cupo gratis de Identity Platform hay que confirmarlos en la consola: no los doy por sentados.
  - Falta verificar que el segundo factor funcione en la app del celular con el SDK de JavaScript. Si no funciona, lo aviso antes de seguir.
- **Familias: enlace mágico de 15 minutos y un solo uso.** El enlace por email que trae Firebase no deja fijar esos 15 minutos de forma garantizada, así que propongo uno propio:
  1. La familia escribe su email. Una Function verifica que el adulto exista, tenga el portal habilitado y tenga email cargado. Si no se cumple, la respuesta es la misma, para no revelar qué emails existen.
  2. Genera un código de un solo uso, guarda solo su huella (hash) y le pone un vencimiento de 15 minutos.
  3. El email con el enlace sale por el canal que elijas (pregunta 3). El email no lleva información clínica.
  4. Al tocar el enlace, otra Function valida el código, lo marca usado y devuelve un token de sesión de Firebase. Cada ingreso queda en el registro de accesos.
- **Sin autorregistro.** Solo existen las cuentas de los adultos que habilitás vos.

---

## 7. Prevención de doble reserva

Regla 2: dos turnos confirmados nunca se superponen, buffer incluido. Se garantiza en el servidor:

1. Ningún cliente escribe `appointments` directo: las reglas lo prohíben. Crear, confirmar y mover pasan por Functions.
2. Por cada día hay un documento `agendaDays/{fecha}` con los bloques ocupados: `[inicio − buffer, fin + buffer)` de cada turno **confirmado**.
3. "Confirmar" (o crear y confirmar, o mover un confirmado) corre en una **transacción de Firestore**:
   1. Lee el día del turno, y también el día anterior o el siguiente si el buffer cruza la medianoche.
   2. Si el nuevo bloque se pisa con alguno existente, rechaza con el error "Se superpone con el turno de las 10:30".
   3. Si no, escribe el turno, actualiza los días y suma la entrada al historial, todo junto.
   4. Si dos confirmaciones llegan a la vez, Firestore reintenta la transacción y la segunda ve el bloque ocupado. No puede ganar más de una.
4. Cancelar o marcar ausente libera el bloque en la misma transacción.
5. Los turnos "solicitado" y "pendiente de confirmación" **no** ocupan bloque: solo avisan que hay una superposición.
6. "Fuera de horario", "fuera de zona" y "buffer insuficiente" (con turnos no confirmados) son **avisos**, no bloqueos. El servidor devuelve la lista de avisos y vos confirmás igual si querés.
7. Tests:
   - Se fuerza una escritura directa y las reglas la rechazan.
   - Dos confirmaciones al mismo tiempo: solo una gana.
   - Un turno cancelado libera el horario.
   - Reprogramar deja rastro en el historial.

---

## 8. Variables de configuración

| Dónde | Qué | Ejemplo |
| --- | --- | --- |
| `.env` (público, va en la app) | Configuración web de Firebase (no es secreta) | `EXPO_PUBLIC_FIREBASE_API_KEY`, `…_AUTH_DOMAIN`, `…_PROJECT_ID`, `…_STORAGE_BUCKET`, `…_APP_ID` |
| `.env` | Uso de emuladores en desarrollo | `EXPO_PUBLIC_USE_EMULATORS=true` |
| Secret Manager (Functions, nunca en la app) | Firma del webhook de Make (HMAC) | `MAKE_WEBHOOK_SECRET` |
| Secret Manager | Secretos de los endpoints entrantes | `INBOUND_SECRET_CAL`, `…_PLAUD`, `…_TELEGRAM`, `…_TALLY`, `…_MENSAJERIA` |
| Secret Manager | Clave de la API de Claude | `ANTHROPIC_API_KEY` |
| Secret Manager | Credenciales de envío de email del enlace mágico (si es por SMTP) | `SMTP_…` |
| Parámetros de Functions | URL del webhook de Make y región | `MAKE_WEBHOOK_URL`, `REGION` |
| Firestore `settings/*` (lo editás en Configuración) | Horarios, bloqueos, duraciones, buffer, zonas, ámbitos, precios, monedas, descuento por hermano, links de Cal.com, PacienteX y recetas, calendario "verificado", plantillas, IA encendida o apagada, eventos activos | Valores iniciales de la sección 7.16 del prompt; la IA arranca **apagada** |

Va un `.env.example` sin secretos reales.

---

## 9. Diseño

### 9.1 Tokens

Medí los colores sobre `docs/referencia-ui.png` y les ajusté el contraste. Van en un único archivo de tokens (`src/theme/tokens.ts`).

| Token | Valor | Uso | Contraste |
| --- | --- | --- | --- |
| `sidebar` | #1E2B4D | Barra lateral (en la imagen da #1E2A3B) | Blanco encima: 13,9:1 |
| `sidebarText` | #AEB9D3 | Ítems no activos | 7,1:1 |
| `primary` | **#2563EB** | Acción principal. El #2F6FED del prompt da 4,5:1 con texto blanco, justo en el límite; propongo este, apenas más oscuro | 5,2:1 |
| `bg` | #F4F8FC | Fondo (en la imagen da #F2F8FC) | — |
| `surface` | #FFFFFF | Tarjetas | — |
| `text` | #1F2A44 | Texto principal | 13,4:1 |
| `textSecondary` | #5B6585 | Texto secundario | 5,8:1 |
| `celeste` | fondo #E3F1FD · ícono #3B8FE0 · texto #1D5C99 | Crecimiento y agenda | 6,0:1 |
| `rosado` | fondo #FDEEF3 · ícono #D9467A · texto #A12B57 | Vacunas y próximas acciones | 6,2:1 |
| `verde` | fondo #E5F5EC · ícono #3E9B63 · texto #1F6B40 | Lo que está al día | 5,8:1 |
| `violeta` | fondo #F0EBFC · ícono #7C5CD6 · texto #5B3FB0 | IA | 6,5:1 |
| `naranja` | fondo #FEF0E4 · ícono #E07A2E · texto #9A4A12 | Prevención | 5,6:1 |
| `alert` | #C62828 sobre #FDECEC | Solo alertas, siempre con ícono y texto | 4,9:1 |
| `contact` | #1F7A4D | Solo el botón de PacienteX | Blanco encima: 5,3:1 |

- **Tipografía Inter:**
  - Títulos 28/22/18 (semibold).
  - Cuerpo 16 en web y 17 en el celular.
  - Texto chico 13–14.
- **Medidas y estados:**
  - Áreas táctiles de 44 px o más.
  - Radios de 12 a 16.
  - Sombra suave.
  - Foco visible: anillo de 2 px en `primary`.
- **Rosado y rojo.** El rosado de vacunas se parece al rojo de alerta, así que la alerta siempre lleva ícono y la palabra ("Alergia", "Vencido"), y nunca depende solo del color.

### 9.2 Mapa de pantallas

| Módulo | Web y tablet (barra lateral) | Celular (barra inferior) |
| --- | --- | --- |
| Inicio | Tablero: turnos de hoy, próximos días, solicitudes, seguimientos, avisos, accesos rápidos, semana | Inicio: lo mismo apilado; accesos rápidos arriba |
| Agenda | Día, semana y mes; panel lateral del turno | **Agenda** (pestaña): vista diaria primero; botón "+ Turno" fijo |
| Pacientes | Lista con solapas y la ficha (sección 5.2 del prompt) | **Pacientes** (pestaña); ficha con pestañas deslizables |
| Familias | Lista y ficha de familia | Más → Familias |
| Historia clínica, Consultas, Prescripciones, Estudios, Vacunas, Crecimiento, Certificados, Prevención | Listados generales por módulo (por ejemplo, todos los estudios pendientes); el detalle se abre en la ficha del paciente | Más → cada módulo |
| Comunicaciones, Documentos, Reportes | Listados y filtros | Más → cada uno |
| IA Asistente | Panel en el Resumen y página propia | Botón flotante que abre una hoja inferior |
| Avisos | Campana con contador en el encabezado | **Avisos** (pestaña) |
| Configuración, Perfil, Cerrar sesión | Abajo en la barra lateral | Más → abajo |
| Portal de la familia | Mismo diseño, centrado y con barra lateral corta | Pensado primero para celular: Inicio · Pedir visita · Fiebre · Mis datos |

---

## 10. Propuesta de etapas

El prompt tiene 11 etapas. La 1 es muy grande, así que propongo partirla:

| Etapa | Contenido |
| --- | --- |
| **1a. Firebase y seguridad** | Estructura de Firebase y emuladores, Auth con roles (custom claims), reglas y sus tests, auditoría por triggers, outbox (sin envío real), datos de demostración en el emulador, `MODELO_DE_DATOS.md` |
| **1b. Diseño y navegación** | Tokens, Inter, barra lateral de 16 módulos, barra inferior del celular, encabezado con buscador y campana, estados vacíos, de carga y de error |
| 2 a 10 | Como en el prompt |

**Migración de los datos de ejemplo.** Los 40 pacientes ficticios de hoy pasan a ser los datos de demostración del emulador, todos marcados como demostración.

---

## 11. Decisiones que tomaría sin preguntarte (salvo que me digas lo contrario)

- **Hosting y SDK:** Firebase Hosting en vez de App Hosting, y el SDK de JavaScript en vez de React Native Firebase (sección 3).
- **Archivos de datos:** la app pasa a leer `assets/data/`; la copia en `src/data/referencias/` se borra con tu OK.
- **Familia sin hijo identificado:** las reservas de Cal.com y el formulario web sin coincidencia de DNI crean una familia "por identificar". No crean pacientes.
- **Turnos prenatales:** van con la familia y sin paciente, porque el bebé todavía no nació.
- **Etiqueta del teléfono:** "WhatsApp" pasa a "Teléfono", con la preferencia de contacto aparte, como pide el 7.3.
- **Edad en el portal:** se sigue mostrando escrita ("3 años y 5 meses"). El formato abreviado queda para tu lado, como decidiste antes.
- **Tablet:** se habilita para iPad (`supportsTablet`) y se permite girarla. Hoy está bloqueada en vertical.

---

## 12. Preguntas antes de la Etapa 1

1. **Texto del botón de PacienteX.** El prompt dice "Contactá al Dr. por PacienteX", pero hoy me pediste "Escribime por PacienteX" y ya está en la app. ¿Cuál queda?
2. **Proyecto de Firebase.** ¿Uso tu proyecto "Turnos Domicilios" (`turnos-domicilios-93139`) o creás uno nuevo, por ejemplo "pediatric-os"? Mientras tanto desarrollo con emuladores y no hace falta tocar ninguno.
3. **Envío del email del enlace mágico.** ¿Por dónde sale?
   - (a) Make, con un evento nuevo `auth.enlace_acceso`. El enlace pasa por Make, igual que hoy tus WhatsApp.
   - (b) Directo desde Firebase, por SMTP con tu cuenta de Gmail o Workspace. El enlace no pasa por terceros.

   Recomiendo (b).
4. **Región de los datos.** Propongo **`southamerica-east1` (San Pablo)**: es la más cercana a Argentina y la latencia es la más baja, aunque igual hay transferencia internacional de datos de salud, a Brasil. ¿La aprobás para revisarla con tu abogado, o preferís otra (por ejemplo, Estados Unidos)?
5. **Pestañas de la ficha.** La lista del prompt no tiene lugar para los datos editables (DNI, ámbito, cobertura, adultos y domicilios) ni para el registro de fiebre del médico. Propongo sumar "Datos y familia" y "Fiebre" a las pestañas. ¿Está bien?
6. **Fiebre del lado médico.** La barra lateral del prompt no tiene "Fiebre". ¿Alcanza con verla en Inicio (avisos) y en la ficha, o la sumo al menú?
7. **Java.** Para los emuladores hay que instalar Java (JDK 21) en tu Mac. ¿Lo instalás vos con el instalador oficial, o preferís que te guíe paso a paso cuando arranquemos la Etapa 1a?

Con tus respuestas y tu OK arranco la Etapa 1a.

---

## 13. Respuestas del Dr. (17/10/2026)

1. **Botón de PacienteX:** queda "Escribime por PacienteX". Esto reemplaza al texto del prompt maestro.
2. **Herramienta y proyecto de Firebase:** decide Claude (ver 13.1).
3. **Email del enlace mágico:** opción (b), directo desde Firebase por SMTP con la cuenta de Gmail o Workspace del Dr. La contraseña de aplicación se guarda en Secret Manager.
4. **Región:** `southamerica-east1` (San Pablo), sujeta a la revisión legal del Dr.
5. **Pestañas de la ficha:** se suman "Datos y familia" y "Fiebre".
6. **Fiebre del lado médico:** alcanza con Inicio (avisos) y la ficha. No va en el menú.
7. **Java:** lo más fácil, el instalador oficial de Temurin JDK 21 para Mac con chip Apple (ver 13.2).

### 13.1 Herramienta de desarrollo y proyecto de Firebase

- **Mientras se desarrolla:**
  - Se sigue con Expo Go en el iPhone y la versión web en la computadora.
  - El SDK de JavaScript de Firebase funciona en los dos, y en las Etapas 1 a 3 no hace falta nada nativo.
- **Antes del uso real**, o cuando se necesite algo nativo (notificaciones push, App Check), se pasa a una **versión de desarrollo propia (EAS development build)**:
  - Es tu app, instalada en tu iPhone, en lugar de Expo Go.
  - Ya no depende de qué versión de Expo trae Expo Go. Ese problema ya nos pasó una vez con la SDK 54 contra la 57.
  - Para instalarla en un iPhone real hace falta una cuenta de Apple Developer, que es paga. Es la misma que vas a necesitar para publicar en la App Store o repartir la app por TestFlight. El precio hay que confirmarlo en el sitio de Apple.
- **Proyecto de Firebase:**
  - Uno **nuevo y dedicado**, "pediatric-os", con la región elegida desde el inicio.
  - No conviene reutilizar "Turnos Domicilios": no sé qué tiene adentro, no tiene región asignada, y mezclar proyectos complica los permisos y las copias de seguridad.
  - Hasta el primer despliegue alcanza con los emuladores (`demo-pediatric-os`), así que no hace falta crearlo todavía. Te aviso cuándo y te paso los pasos.

### 13.2 Instalar Java (una sola vez)

1. Entrá a https://adoptium.net/temurin/releases/?version=21&os=mac&arch=aarch64
2. Descargá el archivo **.pkg** (JDK 21, macOS, aarch64) y abrilo con doble clic.
3. Seguí el instalador hasta el final.
4. Para comprobarlo, en la Terminal: `java -version` tiene que mostrar "21".
