# Dr. Alan Hughes · Pediatría a domicilio

App móvil (iOS y Android) de la práctica de pediatría a domicilio del Dr. Alan Hughes (Zona Norte y CABA). Es su historia clínica y el portal de las familias. Reemplaza al prototipo web Pediatric OS.

Dos roles: el médico (único usuario) y las familias, donde cada adulto responsable tiene su propio acceso.

**Desde el 17/10/2026 manda `docs/PROMPT_MAESTRO.md`** (Pediatric OS, backend Firebase). Donde choque con lo de abajo, gana el prompt maestro. Etapa 0 (exploración y propuesta, sin código): `docs/ETAPA_0_PROPUESTA.md`; respuestas del Dr. en su sección 13 (botón "Escribime por PacienteX", email del enlace por SMTP, región southamerica-east1, Expo Go hasta necesitar un development build, proyecto Firebase nuevo "pediatric-os" más adelante). Etapas 1a (Firebase, ver abajo), 1b (diseño y navegación) y 2a (pacientes y familias sobre los datos de ejemplo) hechas. Etapa 2b hecha: la app se conecta a Firebase (ver "Datos de la app"). Etapa 3 hecha: agenda y turnos (ver "Agenda"). Etapa 4 hecha: clínica (ver "Clínica"). Etapa 5 hecha en dos partes: 5a (vacunas, medicación y prescripciones, estudios, plan de cuidado) y 5b (archivos, certificados y prevención); ver "Seguimiento". Etapa 6 hecha en dos partes: 6a (servidor del portal: enlace mágico y copias filtradas) y 6b (la app del portal conectada a Firebase); ver "Portal". Etapa 7 hecha en dos partes: 7a (Configuración, membresías y pagos) y 7b (comunicaciones, reportes, ámbitos y plantillas de certificados); ver "Gestión". Etapa 8 hecha en dos partes: 8a (eventos salientes completos, avisos programados y Configuración › Automatizaciones) y 8b (endpoints entrantes: formulario web, Tally, Plaud, pago por Telegram y mensajería); ver "Automatizaciones" y `docs/AUTOMATIZACIONES.md`. Próximo paso: Etapa 9 (IA Asistente), con el OK del Dr.

**Ubicación:** desde el 17/10/2026 la app vive en `Downloads/Proyecto Lanzamiento Domicilios Premium/pediatria-domicilio` (pedido del Dr.; antes estaba dentro de `Downloads/Telepediatría`, que es otro proyecto: telemedicina escolar). El resto de esa carpeta es material del negocio de domicilios, de referencia (no manda sobre el prompt maestro); también `Downloads/Consultorio/`. **No abrir** las planillas y carpetas con pacientes reales (`base_pacientes*.xlsx`, `pacientes_pediatricos DrApp.xlsx`, `Consultorio/Pacientes/`, `informe_ejemplo.pdf`). La ruta tiene espacios: en scripts, siempre entre comillas.

Ver también `AGENTS.md` (guía de Expo: usar `npx expo install`, docs versionadas, Expo Router).

## Stack

- Expo SDK 57 + React Native 0.86 + TypeScript, Expo Router (rutas en `src/app/`).
- **SDK 57 a propósito**: es la versión que corre el Expo Go del iPhone del Dr. No subir de SDK sin preguntarle.
- Por defecto la app usa datos de ejemplo **ficticios** en memoria (`src/data/mock.ts`). El backend es **Firebase** (prompt maestro): reglas, Functions y datos de demostración en los emuladores; la app se conecta desde la Etapa 2b (ver "Datos de la app").
- Gráficos con `react-native-svg`. Tipografía Inter (`@expo-google-fonts/inter`).
- Probar en el teléfono: `npx expo start --tunnel --clear` y abrir en Expo Go. `@expo/ngrok` está instalado en el proyecto, porque la instalación global falla por permisos.
- Tests con jest-expo. `expo-modules-core` está mapeado en la config de jest a la copia anidada en `node_modules/expo`, porque instalarlo en la raíz choca con una dependencia opcional.

## Datos de la app (desde la Etapa 2b)

- Dos fuentes con el mismo contrato (`src/data/contrato.ts`); las pantallas solo usan `useApp()`:
  - `demo` (por defecto): datos ficticios en memoria y selector de rol (`src/data/fuenteDemo.tsx`).
  - `firebase`: ingreso real del médico con email y contraseña, lecturas en vivo de Firestore y escrituras con la firma que piden las reglas (`src/data/firebase/`). Se elige con `EXPO_PUBLIC_DATOS=firebase` (`npm run web:firebase`, con `npm run emuladores` y `npm run sembrar`).
- Lo crítico va por Functions (`operaciones` del contrato): `crearPaciente`, `aprobarNota`, `corregirNota`, `emitirCertificado`, `anularCertificado`, `crearTurno`, `accionTurno` y `enviarResumen` (`enviarResumenFamilia`). En demostración hacen lo mismo en memoria.
- En `firebase`, la familia entra con el enlace mágico y lee solo las copias del portal (ver "Portal"). El asistente todavía no tiene pantallas.
- El servidor escribe las fechas como la app (hora de Argentina con `-03:00`, `shared/fechaHora.ts`), porque la app compara fechas como texto.
- En el celular la sesión de Firebase no queda guardada: se vuelve a ingresar al abrir la app. La sesión persistente llega con la versión propia de la app (EAS).

## Agenda (desde la Etapa 3)

- Los turnos (`Appointment`) están separados de las consultas: el turno organiza la visita; la consulta (`appointmentId` opcional) es lo clínico. Ya no existen consultas "programadas".
- Reglas comunes en `shared/agenda.ts` (app y servidor): superposición con buffer, horario, bloqueos, zona, estados y acciones permitidas. Entre dos turnos confirmados queda siempre el buffer; un choque entre confirmados bloquea, lo demás es aviso ("Guardar igual").
- En Firebase todo turno pasa por el servidor (`functions/src/turnos/`): `crearTurno`, `accionTurno` (transacción sobre `agendaDays`) y el endpoint `reservaCalcom` (firma `X-Cal-Signature-256` con `CALCOM_WEBHOOK_SECRET`; vínculo por DNI o "por identificar"; idempotente). En la demostración, `src/data/turnosDemo.ts` hace lo mismo en memoria.
- Configuración en `settings/agenda` (horarios, duración por tipo, buffer, zonas). Los valores iniciales de `CONFIG_AGENDA_INICIAL` son provisorios: se editan en Configuración (Etapa 7).
- Eventos para Make: `turno.solicitado`, `turno.confirmado`, `turno.reprogramado`, `turno.cancelado`, `turno.en_camino`, solo con ids, horario y modalidad. `turno.recordatorio_24h` llega en la Etapa 8.
- Pantallas: Agenda (día, semana, mes), `medico/turno/nuevo`, `medico/turno/[id]` (acciones e historial). Inicio muestra los turnos de hoy, lo que falta confirmar y los próximos días.

## Clínica (desde la Etapa 4)

- Antecedentes (`backgrounds`, `components/ficha/Antecedentes.tsx`): uno por paciente, en la pestaña Historia clínica; se guardan solos. La familia no los ve.
- La consulta registra los problemas que se abordaron (`problemIds`) y muestra su turno de origen.
- IA apagada (`db.ia`, en Firebase `settings/ia`): "Generar borrador con IA" queda deshabilitado con la explicación y no aparece "Volver a generar". `lib/notaIA.ts` (borrador de ejemplo) queda para cuando se conecte la IA (Etapa 9).
- Resumen para la familia: en la nota aprobada, "Preparar el mail" (`shared/resumen.ts`, solo el resumen) → el Dr. lo edita → "Revisé y lo mando". El servidor emite `resumen.envio_aprobado` (el único evento con texto clínico) y registra una comunicación sin el texto.
- Módulos de la barra lateral: Historia clínica (`medico/historia`: notas sin aprobar, problemas activos, alergias), Consultas (`medico/consultas`) y Crecimiento (`medico/crecimiento`: última medición con percentilos; primero los avisos). Lecturas en `src/data/clinica.ts`. La ficha abre en una pestaña con `?solapa=`.

## Seguimiento (desde la Etapa 5a)

- Vacunas (`shared/vacunas.ts`, `components/ficha/Vacunas.tsx`, módulo `medico/vacunas`): el esquema sale tal cual de `assets/data/calendario_vacunas.json` (BORRADOR). Se genera al dar de alta un paciente (servidor y demostración) o con "Generar esquema" para los que ya existían. "Atrasada" se calcula. Mientras `settings/vacunas.calendarioVerificado` sea false se ve "Calendario sin verificar", la familia no ve fechas estimadas y no salen recordatorios (`puedeRecordarVacunas`). El Dr. lo marca en el módulo Vacunas (se mudará a Configuración en la Etapa 7).
- Medicación y prescripciones (`components/ficha/Medicacion.tsx`, módulo `medico/prescripciones`): la dosis la escribe el médico; nunca se sugiere ni se calcula. "Emitir receta en…" abre `CONFIG.recetasUrl` (vacío hasta Configuración: el botón lo explica).
- Estudios (`components/ficha/Estudios.tsx`, módulo `medico/estudios`): solicitado → realizado → resultado → revisado, con "Revisar resultado el". Los resultados sin revisar y las vacunas atrasadas están en Avisos.
- Plan de cuidado: categoría "estudio" y estado cancelado (`cancelledAt`); las vacunas ya no son ítems del plan.
- Lecturas en `src/data/seguimientoClinico.ts`. La familia ve las vacunas aplicadas; medicación, prescripciones y estudios no.
- Archivos (Etapa 5b, `src/lib/archivos.ts`, `archivos` del contrato): se suben a Cloud Storage y se leen con la sesión del médico (`getBytes`); en la web se abren como `blob:` y en el teléfono se guardan en la caché y se comparten. Nunca hay enlaces públicos; los enlaces firmados para la familia llegan en la Etapa 6. En la demostración quedan en la memoria del dispositivo.
- Documentos (`components/ficha/Documentos.tsx`, módulos `medico/documentos` y `medico/certificados`): tipo, fecha, quién lo cargó y "Lo ve la familia". Se adjuntan también a una prescripción (PDF de la receta) o a un estudio (resultado).
- Certificados: el servidor arma el PDF al emitir (`functions/src/certificadoPdf.ts`, pdf-lib) y lo guarda en Storage antes de registrar el certificado. Tipo nuevo "Constancia de atención" (redacción neutra). La demostración sigue armando el PDF en el teléfono (`lib/certificadoPdf.ts`).
- Prevención (`medico/prevencion`, `components/ficha/MaterialFamilia.tsx`, `src/data/prevencion.ts`): la biblioteca la carga el Dr. (PDF o enlace https, edades y temas); la ficha sugiere los de la edad que no se mandaron; "Enviar" pasa por `enviarMaterial` (registra el envío y emite `material.enviado`).
- `npm run test:integracion` levanta también el emulador de Storage.

## Portal (desde la Etapa 6a)

- La familia lee SOLO las copias `portal/{paciente}/{sub}`, que arman los triggers de `functions/src/portal/triggers.ts` con `proyeccion.ts` (lógica pura: qué ve la familia de cada dato). Los originales clínicos están cerrados para ella. La fiebre la escribe en `clinical/{paciente}/fever` (origin familia) y la lee en su copia.
- Enlace mágico (`functions/src/portal/enlace.ts`): `pedirEnlace` (misma respuesta exista o no el email; huella SHA-256, 15 minutos, un solo uso, 3 pedidos por ventana) y `entrarConEnlace` (crea el usuario si hace falta, calcula el acceso y devuelve un token con rol familia; registra el ingreso). El mail sale por SMTP con `SMTP_USUARIO` y `SMTP_CLAVE` (Secret Manager); sin ellos no sale nada y solo en el emulador se devuelve `enlaceDePrueba`. `URL_APP` arma el enlace (`/ingresar?token=…`).
- Parámetros comunes en `functions/src/params.ts` (`ORGANIZACION_ID`, `URL_APP`).
- Las copias no llevan `organizationId` (si no, se mezclarían con lo clínico que el médico lee por grupo de colecciones).
- App (Etapa 6b): `ingresar.tsx` pide el enlace (`pedirEnlaceEmail`) y entra solo con `?token=`; en el emulador muestra "Abrir el enlace" en lugar del mail. En Firebase, `fuenteFirebase` escucha `portalAccess`, el adulto, sus direcciones y cada copia, y `portalFamilia.ts` (`armarVistaFamilia`) las arma con la forma de las pantallas. Si se le quita el acceso, se cierra la sesión.
- Acciones de la familia: pedir visita (`familia/pedir-visita`, servidor `pedirVisita`: solicitud, nunca confirmación; tope de 3 abiertas) y Mis datos (`familia/(tabs)/membresia.tsx`: teléfono, email, preferencia y direcciones; al Dr. le llega el aviso "Datos actualizados"). Todo queda en el `auditLog`.
- **La familia no baja documentos ni materiales desde el portal** (decisión del Dr., 17/10/2026): las comunicaciones a las familias (qué información mandar según edad y época del año) las va a manejar un agente que él entrena aparte. Las copias del portal no incluyen documentos ni materiales, y el médico ya no tiene "Lo ve la familia" en los documentos. Los certificados sí siguen en el portal.
- Para que salgan mails reales faltan las credenciales SMTP del Dr. (`SMTP_USUARIO`, `SMTP_CLAVE`).

## Gestión (desde la Etapa 7a)

- Configuración (`medico/configuracion`, `components/configuracion/`): una sección por vez (`?seccion=`). Profesional (nombre, MN, MP y firma de los certificados nuevos → `professionals/{uid}`), Agenda (horarios, duraciones, buffer y zonas → `settings/agenda`; los bloqueos siguen en la Agenda), Membresía y precios (`settings/precios`), Links (PacienteX, Cal.com y recetas → `settings/links`, que también lee la familia), estado del calendario de vacunas, biblioteca e IA (apagada hasta la Etapa 9). Operación `guardarAjustes`; valores iniciales y cuentas en `src/data/configuracion.ts` (`PRECIOS_INICIALES` son los que pasó el Dr.; `src/config.ts` quedó solo como links de arranque).
- Membresías (`medico/(tabs)/membresias.tsx`, `medico/membresia/[familia]`, `medico/pago`, lecturas en `src/data/membresias.ts`): estados guardados activa, suspendida o cancelada; "por renovar" y "vencida" se calculan. Suspendida bloquea pedir visitas como vencida; cancelada pide como cualquier familia. Renovar = membresía nueva (la anterior queda). Precio de lista: anual con el descuento por hijo adicional; semestral sin descuento (el Dr. no lo definió).
- Pagos: familia, membresía (opcional), fecha, monto, moneda, medio, concepto y estado. Los "a confirmar" (bot de Telegram, Etapa 8) se ven en Membresías y en Avisos y se confirman o archivan. Nunca se borran.
- La familia ve su membresía y sus pagos confirmados en Mis datos, solo lectura (en Firebase, en la copia `datos/familia`; trigger `portalPago`). No ve las observaciones del Dr.
- Comunicaciones (Etapa 7b, `medico/comunicaciones`, `src/data/comunicaciones.ts`): registro, no chat. Canal (email, PacienteX, teléfono, en persona, Telegram, otro; sin WhatsApp), dirección, clasificación (administrativo, clínico, urgente), fecha, familia/paciente y estado (registrado, enviado a Make, entregado, fallido). El Dr. registra a mano con `registrarComunicacion` (asunto breve, sin datos clínicos: el asistente también lee este registro). El resumen aprobado queda como saliente y clínico. Lo que salga o entre por Make se registra en la Etapa 8.
- Reportes (`medico/reportes`, `src/data/reportes.ts`, `src/lib/exportar.ts`): mensual, solo con datos del sistema. Visitas = consultas realizadas del mes (por tipo y ámbito); pacientes nuevos; vacunas atrasadas y del mes; membresías y pagos a confirmar como están hoy; lo cobrado en el mes. CSV con `;` y BOM para Excel; PDF con la impresión del navegador (web) o expo-print. El CSV y el PDF llevan solo cantidades.
- Ámbitos (`settings/ambitos.nombres`, `db.ambitos`): se cambia el nombre de los cinco ámbitos fijos; sumar uno nuevo requiere tocar el modelo.
- Plantillas de certificados (`settings/certificados.plantillas`, `db.plantillas`, `textoDePlantilla` en `lib/certificados.ts`): texto y destino con que arranca cada tipo; `{apto}` = apto/apta (con sexo X, "en condiciones"; sin plantilla guardada, la redacción neutra de siempre). Los emitidos no cambian.
- Los ajustes se crean o actualizan según existan (actualizar uno inexistente lo rechazan las reglas).
- Automatizaciones en Configuración: Etapa 8.

## Automatizaciones (desde la Etapa 8a)

- `docs/AUTOMATIZACIONES.md` es para el Dr.: payload de cada evento, qué cambiar en cada escenario de Make y cómo probar. Claude no toca Make ni Notion.
- Catálogo único en `shared/eventos.ts` (`TIPOS_EVENTO` y `CATALOGO`: audiencia familia/médico/sistema y plantilla). Plantillas solo las que el Dr. nombró (`confirmacion_turno`, `resumen_visita`, `bienvenida_membresia`, `aviso_renovacion_membresia`); las demás, `null` hasta que las defina.
- `encolarEvento` (functions/src/outbox/encolar.ts) suma destinatarios (nombre, email, teléfono E.164, preferencia) y el nombre de pila de los chicos; respeta los eventos apagados (`settings/automatizaciones.apagados` → estado "apagado") y con `clave` sale una sola vez (id fijo en la outbox).
- Nada clínico en los eventos (ni vacunas, ni estudios, ni temperaturas, ni descripciones del plan), salvo `resumen.envio_aprobado`. `certificado.emitido` lleva el PDF por enlace firmado de 3 días (null en el emulador).
- Programados (`outbox/programadosTriggers.ts`, lógica pura en `programados.ts`): cada hora el recordatorio 24 h; a las 8 seguimientos vencidos, vacunas (solo con el calendario verificado), estudios para revisar, membresías por renovar, pagos vencidos y controles próximos. Usan `ORGANIZACION_ID`. `correrAvisosDiarios` y `correrAvisosHorarios` se prueban en `tests/integracion/eventos.test.ts`.
- Sin `MAKE_WEBHOOK_URL` los eventos quedan `sin_destino` (no se simula el envío). Configuración › Automatizaciones muestra el estado y los últimos eventos.
- Entrada (Etapa 8b, `functions/src/entrada/`): `entradaMake` es un solo endpoint (firma HMAC con `MAKE_WEBHOOK_SECRET`, idempotente por `tipo` + `id` en `inbound`). Lectores puros con tests en `leer.ts` (pago de Telegram, fecha de nacimiento y medidas dictadas, contacto, estado). Cal.com sigue con `reservaCalcom` (reserva, reprogramación y cancelación).
- Colecciones nuevas, solo las escribe el servidor: `interesados` (contacto; lo ve el equipo), `admisiones` (mensaje y respuestas), `triage` y `transcripciones` (las tres, solo el médico). El Dr. las atiende con `actualizarEntrada`.
- Pantallas: `medico/interesados` ("Crear la familia" precarga `familias/nueva?interesado=`), `medico/triage/[id]` (y en el turno), `medico/plaud/[id]` (paciente sugerido, consulta del día o nueva, medidas con "Usar estos valores"/"Descartar"; la transcripción queda como `rawText`). El pago de Telegram sin familia reconocida se completa en `medico/pago`. Avisos para lo pendiente.

## Firebase (desde la Etapa 1a)

- Proyecto de desarrollo: `demo-pediatric-os`, solo emuladores; el prefijo `demo-` impide tocar nada real. El proyecto real "pediatric-os" se crea más adelante, con el Dr.
- Región de las Functions: `southamerica-east1` (sujeta a revisión legal del Dr.).
- `firestore.rules`, `storage.rules`, `firestore.indexes.json`. Modelo y permisos: `docs/MODELO_DE_DATOS.md`.
- `functions/`: Cloud Functions (TypeScript, Node 22) con `asignarRol`, auditoría por triggers, `portalAccess` y rol de familia, y outbox hacia Make (HMAC y reintentos). firebase-admin 13; la 14 no carga en el emulador.
- `scripts/sembrar.ts`: datos de demostración en el emulador (40 pacientes, 36 adultos). Usuarios de prueba: `medico@ejemplo.com` y `asistente@ejemplo.com` (la clave está en el script, solo para el emulador).
- **Usar la CLI del proyecto** (`npx firebase`, o los scripts de npm), no la de `/usr/local/bin`: esa trae su propio Node 20.
- Requiere Java 21 (Temurin, ya instalado).
- Comandos:
  - `npm run emuladores` levanta Auth, Firestore, Functions y Storage, con la interfaz en http://127.0.0.1:4000.
  - `npm run sembrar` carga los datos de demostración, con los emuladores corriendo.
  - `npm run test:reglas` corre los tests de reglas.
  - `npm run test:funciones` corre la lógica de las Functions.
  - `npm run test:integracion` prueba los triggers en el emulador.
  - `npm run typecheck` revisa la app, los tests, los scripts y las Functions.

## Estructura

```
src/
  app/            Pantallas (Expo Router)
    index.tsx       Selector de rol (modo prueba)
    ingresar.tsx    Ingreso de familias con enlace mágico (simulado en la demostración, real en Firebase)
    familia/        Portal de la familia: (tabs) Inicio, Pedir visita, Fiebre, Mis datos; hijo/[id], fiebre/, urgencia, pedir-visita
    medico/         Médico: (tabs) Hoy, Pacientes, Fiebre, Membresías; hijo/[id] (ficha), paciente/nuevo, adulto/[id], adulto/vincular, accesos, certificado/nuevo, consulta/[id], seguimiento/[id], fiebre/, familia/[id]
  components/     Componentes de interfaz: escritorio/Marco.tsx (barra lateral y superior en pantallas de 1024 px o más; en el teléfono, pestañas), ficha/ (ficha completa del médico), crecimiento/ (curvas P3–P97 y tabla), certificados/, consulta/, fiebre/, formularios.
                  FichaHijo.tsx es la ficha del portal de la familia.
  shared/         Lógica pura compartida por la app (@shared/…) y las Functions: duplicados (regla 8), teléfonos E.164.
  data/
    types.ts        Modelo de datos (una interfaz = una tabla)
    mock.ts         Datos de ejemplo ficticios
    mockPacientes.ts  33 pacientes ficticios más (40 en total) para la lista
    store.tsx       Estado en memoria + sesión simulada; escrituras con auditoría
    vistaFamilia.ts Lo que puede ver un adulto: el store la aplica antes de entregar datos al portal
    selectores.ts   Lecturas comunes
    referencias/    oms_lms.json, argentina_lms.json, hitos_desarrollo.json
  lib/            Lógica pura: percentiles (motor LMS), crecimiento (percentilos por visita), certificados (textos), certificadoPdf (PDF con expo-print), enlaceMagico, busqueda, edad, fechas, hitos, fiebre, notaIA (borrador de ejemplo).
                  Tests: *.test.ts (npm test)
  config.ts       Links de PacienteX y Cal.com
  theme.ts        Colores, tipografías, tamaños
```

## Modelo de datos (`src/data/types.ts`)

Doctor, Family, Guardian (acceso habilitado sí/no), PatientRelationship (tipo, principal, vigencia), Address (cuelga del adulto), Patient (sexo M/F/X, edad gestacional, ámbito, estado), Membership, Payment, ClinicalProblem, Allergy, Consultation, GrowthMeasurement, MilestoneCheck, ClinicalNote (versionada), FollowUp, CarePlanItem (las vacunas son ítems "vacuna"), FeverEntry, Certificate, Document, AuditLog.

- Nada clínico se borra: se archiva (`archivedAt`).
- Las notas aprobadas son inmutables: corregir crea una versión nueva y la anterior queda "Reemplazada".
- Toda escritura pasa por `store.tsx` (`agregar`, `actualizar`, `enLote`), que suma una fila al AuditLog. El AuditLog solo suma filas.

## Cómo trabajar (reglas del Dr. Hughes)

1. Plan por etapas y esperar su OK antes de escribir código.
2. Una etapa por vez. Al terminar cada una: chequeo de tipos (`npx tsc --noEmit`), linter (`npx eslint src`) y tests (`npm test`); verificar que la app arranque sin errores; commit con mensaje en español; contar en pocas líneas qué cambió y cómo probarlo en el teléfono; esperar su OK.
3. No romper lo que ya funciona: consulta, nota clínica, seguimientos y registro de fiebre. No reescribir módulos enteros ni borrar archivos sin preguntar.
4. Si hay backend, usarlo; si no, seguir con datos ficticios. Nunca cargar datos reales de pacientes.
5. Si algo choca con lo construido o no está claro: preguntar antes. No inventar datos clínicos.
6. No tocar todavía: importación de Plaud, conexión real con IA, envío de mails, sincronización con Notion, firma digital.
7. Ante la duda entre dos soluciones, la más simple.

## Reglas generales

- Interfaz en español rioplatense con voseo ("Cargá", "Tocá"). Nunca "tú" ni "vosotros".
- Marca del lado médico: "Pediatric OS" con "Cuidando hoy su mañana"; la frase "Pequeños pacientes, grandes historias" va en el encabezado. En el portal de las familias: "Dr. Alan Hughes · Pediatría a domicilio".
- Tokens en un único archivo, `src/theme.ts` (medidos sobre `docs/referencia-ui.png`): barra lateral #1E2B4D, acción #2563EB (`colors.accion`), fondo #F4F8FC, texto #1F2A44.
- Un pastel por sección (`categorias`): celeste (crecimiento y agenda), rosado (vacunas y próximas acciones), verde (al día), violeta (IA), naranja (prevención). Cada uno tiene fondo, acento (íconos) y texto con contraste AA. Rojo intenso únicamente para alertas, siempre con ícono y palabra.
- Única excepción: el botón de PacienteX es verde (#1F7A4D, `colors.contacto`), a pedido del Dr.
- Tipografía Inter. Áreas táctiles de 44 px o más, foco visible (`anilloFoco`), estados vacío, de carga, de error y de confirmación en `components/Estados.tsx`.
- Navegación: una sola lista de módulos en `src/navegacion/modulos.ts`. Web y tablet: barra lateral con los 16 módulos. Celular: Inicio · Agenda · Pacientes · Avisos · Más. Los módulos sin construir dicen en qué etapa llegan. Los avisos salen de datos reales (`src/data/avisos.ts`).
- Tono cálido y profesional, nada comercial. Botones grandes y pocos pasos (padres con un bebé en brazos).
- Contacto: **no hay WhatsApp en ningún lado**, tampoco como preferencia de contacto del adulto (solo llamada o email; las reglas lo exigen). Botón "Escribime por PacienteX" (texto elegido por el Dr. el 17/10/2026), que abre `CONFIG.pacienteXUrl` en el navegador del teléfono.
- La app nunca sugiere dosis ni diagnósticos a las familias.

## Estado (17/10/2026)

Pedido de etapas A a F terminado. Detalle punto por punto en `VERIFICACION.md`.

Rediseño visual terminado (etapas G a K, referencia: imagen tipo tablero de Pediatric OS que mandó el Dr.):
- **G (hecha):** paleta de categorías, tarjetas con sombra suave, versión web con barra lateral y barra superior con buscador. Módulos que todavía no existen (Agenda, Prescripciones, Estudios, Comunicaciones, Reportes, IA Asistente) aparecen en gris como "Próximamente" y no se abren.
- **H (hecha):** ficha del paciente como tablero (`ficha/FichaPaciente.tsx`): encabezado con iniciales, edad, último peso y talla, DNI y etiquetas; botones Nueva consulta y Emitir certificado; solapas Resumen, Datos y familia, Historia clínica, Consultas, Crecimiento, Plan y vacunas, Fiebre, Documentos. "Resumen" (`ficha/Resumen.tsx`) son tarjetas de solo lectura más el plan por plazo (`lib/planPorPlazo.ts`: Hoy, Próximos 30 días, Próximos meses, Prevención). Las demás solapas usan los bloques de siempre.
- **I (hecha):** "Hoy" con cifras del día (visitas, seguimientos, fiebre sin revisar, pacientes) y, en pantalla ancha, visitas a la izquierda y seguimientos a la derecha. Lista de pacientes en dos columnas en pantalla ancha. Iniciales con el color del ámbito (`components/Avatar.tsx`: Membresía celeste, Cardales verde agua, Hepta lavanda, Esporádico durazno, Sin asignar arena).
- **J (hecha):** portal de la familia con el mismo estilo: próxima visita destacada, membresía y "Pedí una visita" al lado; selector de hijo con iniciales; ficha del hijo en tarjetas (`components/Caja.tsx`, compartida con el Resumen del médico). El botón de PacienteX no se estira en pantalla ancha.
- **K (hecha):** verificación en `VERIFICACION.md` (sección "Rediseño visual").

- **Médico:** Hoy (visitas, seguimientos pendientes, registro de accesos), Pacientes (solapas por ámbito, búsqueda, alta con aviso de duplicado), ficha completa (encabezado con ámbito y DNI, Contacto, Adultos responsables con domicilios, Problemas, Alergias, Plan de cuidado y vacunas aplicadas, Crecimiento con curvas P3–P97 y tabla, Consultas, Registro de fiebre, Certificados y documentos), consulta (antropometría con el motor de percentilos, hitos, nota clínica versionada), fiebre.
- **Familia:** ingreso con enlace mágico simulado, Inicio con selector de hijo y secciones por hijo, Pedir visita (bloqueado con membresía vencida), registro de fiebre, certificados en PDF. Los datos llegan filtrados por `vistaFamilia`.
- **Calidad:** 246 tests de la app (percentilos, plan por plazo, teléfono E.164, búsqueda, vista de familia para cada adulto, enlace mágico, certificados).
- **Pendiente para la etapa del backend (Vibecode Cloud):** base de datos y archivos reales, envío real del enlace mágico, subir el PDF del certificado al almacenamiento, conexión real con IA. Siguen sin tocar: Plaud, mails, Notion y firma digital.
- **Sin verificar por Claude:** la app en un iPhone real y el PDF generado en el teléfono.
