# Dr. Alan Hughes · Pediatría a domicilio

App móvil (iOS y Android) de la práctica de pediatría a domicilio del Dr. Alan Hughes (Zona Norte y CABA). Es su historia clínica y el portal de las familias. Reemplaza al prototipo web Pediatric OS.

Dos roles: el médico (único usuario) y las familias, donde cada adulto responsable tiene su propio acceso.

**Desde el 17/10/2026 manda `docs/PROMPT_MAESTRO.md`** (Pediatric OS, backend Firebase). Donde choque con lo de abajo, gana el prompt maestro. Etapa 0 (exploración y propuesta, sin código): `docs/ETAPA_0_PROPUESTA.md`; respuestas del Dr. en su sección 13 (botón "Escribime por PacienteX", email del enlace por SMTP, región southamerica-east1, Expo Go hasta necesitar un development build, proyecto Firebase nuevo "pediatric-os" más adelante). Etapas 1a (Firebase, ver abajo), 1b (diseño y navegación) y 2a (pacientes y familias sobre los datos de ejemplo) hechas. Etapa 2b hecha: la app se conecta a Firebase (ver "Datos de la app"). Etapa 3 hecha: agenda y turnos (ver "Agenda"). Etapa 4 hecha: clínica (ver "Clínica"). Etapa 5 partida en dos: 5a hecha (vacunas, medicación y prescripciones, estudios, plan de cuidado; ver "Seguimiento"). Próximo paso: Etapa 5b (archivos en Storage: documentos con enlaces temporales, adjuntos de recetas y estudios, PDF del certificado guardado; certificados y prevención), con el OK del Dr.

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
- En `firebase`, el portal de las familias todavía no entra: las copias filtradas del portal llegan en la Etapa 6. El asistente tampoco tiene pantallas todavía.
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
    ingresar.tsx    Ingreso de familias con enlace mágico simulado (lib/enlaceMagico.ts: punto de integración)
    familia/        Portal de la familia: (tabs) Inicio, Pedir visita, Fiebre, Membresía; hijo/[id], fiebre/, urgencia
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
- Contacto: **no hay WhatsApp en ningún lado**. Botón "Escribime por PacienteX" (texto elegido por el Dr. el 17/10/2026), que abre `CONFIG.pacienteXUrl` en el navegador del teléfono.
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
