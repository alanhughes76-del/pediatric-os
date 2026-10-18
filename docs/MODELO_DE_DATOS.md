# Modelo de datos · Pediatric OS (Firestore)

Estado al 17/10/2026, Etapa 1a. Las reglas están en `firestore.rules` y `storage.rules`, y sus tests en `tests/reglas/` (`npm run test:reglas`).

## Convenciones

- **Organización.** Todo cuelga de `organizations/{orgId}`. Hoy hay una sola organización; en el emulador se llama `org-demo`. Las reglas comparan el `organizationId` del usuario (custom claim) con el de la ruta.
- **Campos que lleva todo documento escrito desde la app:** `organizationId`, `createdBy`, `createdAt`, `updatedBy` y `updatedAt`.
  - Las reglas exigen que `updatedBy` sea el uid de quien escribe.
  - El servidor firma como `"sistema"`.
- **Archivado.** Lo clínico no se borra: se archiva con `archivedAt`. Ninguna regla permite `delete` desde la app.
- **Demostración.** Todo lo que carga `npm run sembrar` lleva `demo: true` y vive solo en el emulador (proyecto `demo-pediatric-os`).
- **Roles** (custom claims de Auth): `{ rol: 'medico' | 'asistente' | 'familia', organizationId }`. Los asigna solo el servidor.

**Leyenda:** M = médico · A = asistente · F = familia (solo lo suyo) · S = servidor (Cloud Functions; no pasa por las reglas) · — = nadie.

## Seguridad y organización

| Ruta | Lee | Escribe | Qué valida la regla |
| --- | --- | --- | --- |
| `users/{uid}` | el propio usuario | S | Rol y organización los fija `asignarRol` o el acceso al portal |
| `organizations/{orgId}` | M, A | S | — |
| `…/settings/{doc}` (`links`: PacienteX, Cal.com y recetas; `precios`: membresía y visitas sueltas; `ia`; `vacunas`; `ambitos`: nombres de los ámbitos; `certificados`: plantillas; `automatizaciones`: eventos apagados; `agenda`: horarios por día, duración por tipo, buffer y zonas) | M; A todo menos `ia`; F solo `links` | M | Firma. Los secretos no van acá: van en Secret Manager |
| `…/professionals/{id}` | M, A | M | Firma |
| `…/consents/{id}` (portal, foto, grabación, IA) | M; F los suyos | M, o F los suyos | No se edita ni se borra: solo se revoca una vez (`revokedAt`) |

## Administrativo (médico y asistente)

| Ruta | Lee | Escribe | Qué valida |
| --- | --- | --- | --- |
| `…/families/{id}` | M, A | M, A | Firma |
| `…/guardians/{id}` | M, A; F su propia ficha (`authUid`) | M, A. F solo `phone`, `email` y `contactPreference` (`llamada` o `email`; sin WhatsApp) | Teléfono en E.164. Sin email no se habilita el portal. Habilitarlo (`portalEnabled`) es decisión del médico. Un adulto nuevo arranca deshabilitado. `authUid` no se cambia desde la app |
| `…/guardians/{id}/addresses/{id}` | M, A; F las suyas | M, A, F las suyas | Firma; no se borran |
| `…/relationships/{id}` (paciente ↔ adulto, tipo, principal, vigencia) | M, A | M, A | Se cierran con `validTo`, no se borran |
| `…/patients/{id}` | M, A | Alta: S (control de duplicados, Etapa 2). Cambios: M, A | Firma |
| `…/memberships/{id}` (`plan`, `status` activa/suspendida/cancelada, `startDate`, `renewalDate`, `patientIds`, `notes`), `…/payments/{id}` (`familyId`, `membershipId?`, `date`, `amount`, `currency`, `method`, `concept`, `status` confirmado/a_confirmar) | M, A | M, A (y S para los pagos de Telegram, Etapa 8) | Firma. Nunca se borran: se archivan. La familia ve su membresía (sin `notes`) y sus pagos confirmados en la copia `portal/{p}/datos/familia` |
| `…/communications/{id}` (`kind`, `channel`, `direction`, `classification`, `at`, `subject`, `status`, `familyId`, `patientId`) | M, A | M, A, S | Firma. No guarda textos clínicos (la lee el asistente): solo un asunto breve. La escriben `enviarResumenFamilia` y el registro a mano; Make, desde la Etapa 8 |
| `…/educationalMaterials/{id}` (título, PDF o enlace, edades en meses, temas) | M, A | M | Firma |
| `…/materialDeliveries/{id}` | M | **Solo S** (`enviarMaterial`, que emite `material.enviado`) | — |

## Agenda (Etapa 3)

| Ruta | Lee | Escribe |
| --- | --- | --- |
| `…/appointments/{id}` | M, A | **Solo S** (`crearTurno`, `accionTurno`, `reservaCalcom`), con una transacción que impide superponer turnos confirmados |
| `…/appointments/{id}/history/{h}` (cada cambio, con antes y después) | M, A (también por grupo de colecciones) | Solo S |
| `…/agendaDays/{AAAA-MM-DD}` (bloques de los turnos confirmados que empiezan ese día) | M, A | Solo S |
| `…/blocks/{id}` (períodos bloqueados) | M, A | M, A |
| `…/inbound/{id}` (registro de lo que entra por los endpoints de Cal.com y de Make, sin datos personales) | M | Solo S |

Turno (`appointments`): `start` (hora de Argentina con `-03:00`), `day`, `durationMin`, `type` (control, urgencia-dia, urgencia-noche, seguimiento, rn, prenatal), `modality`, `familyId` (null mientras está "por identificar"), `patientIds` (hermanos en la misma visita; vacío en un prenatal), `address` (copia de la dirección: cambiarla no toca la guardada), `zone`, `reason`, `opsNotes` (no las ve la familia), `status` (solicitado, pendiente, confirmado, realizado, cancelado, ausente), `origin` (medico, portal, calcom, formulario), `cancelReason`, `onTheWayAt`, `calBookingUid`, `porIdentificar` (contacto de quien reservó por Cal.com sin DNI conocido).

Superposición: entre dos turnos confirmados tiene que quedar al menos el buffer de traslado. La transacción lee el `agendaDays` del día y de sus vecinos; si dos confirmaciones llegan a la vez, Firestore reintenta una y esa ve el lugar ocupado. Cancelado y ausente liberan el horario. La lógica común está en `shared/agenda.ts`.

Horarios, duraciones, buffer y zonas viven en `settings/agenda` (en lugar de las colecciones `availabilityRules` y `zones` de la propuesta: son pocos datos y se editan juntos). Los horarios son un mapa por día de la semana porque Firestore no acepta listas dentro de listas.

## Clínico (solo el médico; el asistente nunca)

Subcolecciones de `…/clinical/{patientId}/`:

`background` · `problems` · `allergies` · `consultations` · `growth` · `milestones` · `vaccineDoses` · `medications` · `prescriptions` · `studyOrders` (y `studyOrders/{id}/results`) · `carePlan` · `notes` · `followUps` · `fever` · `certificates` · `documents`

Etapa 5b: `documents` suma `kind` (certificado, receta, estudio, otro), `origin` (medico, familia, sistema), `visibleToFamily`, `mimeType`, `studyId` y `prescriptionId`; `file` es la ruta en Storage (`orgs/{org}/patients/{paciente}/documentos/…` o `/certificados/{id}.pdf`, que arma el servidor al emitir). Los archivos se leen con la sesión del médico: nunca hay enlaces públicos.

Etapa 5a: `vaccineDoses` (una por dosis del calendario, id `vd-{paciente}-{clave}`, con `dueDate`, `status` pendiente o aplicada, `appliedDate`, `place`, `lot`, `source` calendario o manual; "atrasada" no se guarda, se calcula), `medications` (la dosis la escribe el médico), `prescriptions` (lo indicado y si ya se emitió en la plataforma de recetas) y `studyOrders` (solicitado → realizado → resultado → revisado, con `reviewDate`). La familia ve solo las vacunas. El calendario es `assets/data/calendario_vacunas.json` y `settings/vacunas.calendarioVerificado` dice si el Dr. lo verificó.

`background` es un documento por paciente (`ant-{patientId}`): peso al nacer, tipo de parto, complicaciones perinatales, patológicos e internaciones, familiares, hábitos y medicación actual. La edad gestacional queda en el paciente. `consultations` guarda `problemIds` (problemas que se abordaron) y `appointmentId` (turno de origen).

| Subcolección | Escribe | Regla especial |
| --- | --- | --- |
| Todas (regla general) | M | Firma y `patientId` igual al de la ruta. Sin borrado |
| `notes` | M solo en borrador | Se crea en `borrador`, sin `approvedAt` ni `approvedBy`. Solo se edita mientras sigue en `borrador`; no cambian `version`, `consultationId` ni `patientId`. **Aprobar y corregir lo hace S**: una nota aprobada no se puede tocar ni escribiendo directo en la base (probado) |
| `certificates` | Solo S | Emitir y anular (con motivo) pasan por el servidor |
| `followUps` | S crea; M edita | El médico cambia solo `message`, `status` y `resolvedAt`; el vencimiento no se toca |
| `fever` | M (`origin: 'medico'`) o F con acceso a ese chico (`origin: 'familia'`) | Nadie crea un registro ya revisado. El médico solo marca revisado o lo vincula a una consulta; no cambia los valores. La familia no lee esta colección: lee la copia del portal |

## Portal (copias filtradas que arma el servidor)

| Ruta | Lee | Escribe |
| --- | --- | --- |
| `…/portal/{patientId}/{sub}/{id}` (`datos` [paciente, familia], `summaries`, `allergies`, `problems`, `plan`, `growth`, `vaccines`, `certificates`, `fever`, `turnos`; sin documentos ni materiales) | M; F con acceso vigente a ese chico | Solo S: triggers `portal*` con `functions/src/portal/proyeccion.ts` (qué va y qué no) |
| `…/magicLinks/{huella}` (enlace mágico: huella SHA-256 del código, vence a los 15 min, un solo uso) | — | Solo S (`pedirEnlace`, `entrarConEnlace`) |
| `…/portalAccess/{authUid}` (`enabled`, `patientIds`, `guardianId`) | M; el propio adulto | Solo S (trigger `accesoPorAdulto` / `accesoPorVinculo`) |

Las copias nunca llevan hallazgos, conducta, borradores, notas internas, alergias referidas ni problemas ocultos. Las reglas no pueden ocultar campos sueltos, así que el filtro está en la forma de guardar los datos. Las copias **no llevan `organizationId`**: el médico lee lo clínico por grupo de colecciones filtrando por ese campo, y las copias tienen los mismos nombres (`fever`, `allergies`…).

Lo que la familia hace desde el portal (Etapa 6b):

- Pedir visita: `pedirVisita` (S) crea un turno `solicitado` con origen `portal`, solo para sus chicos, con tope de 3 pedidos abiertos por adulto.
- Mis datos: el adulto actualiza su teléfono, email y preferencia de contacto en `guardians/{id}` y sus direcciones (firma con `updatedBy`). Los triggers `avisoDatosFamilia` y `avisoDireccionFamilia` dejan una `notification` para el médico y emiten `familia.datos_actualizados` (solo ids y nombres de campos).
- Sin descargas: la familia no baja documentos ni materiales desde el portal (decisión del Dr., 17/10/2026).

## Trazabilidad y automatización

| Ruta | Lee | Escribe |
| --- | --- | --- |
| `…/auditLog/{id}` | M | **Solo S, solo altas** (triggers `auditarAdministrativo`, `auditarClinico`, `auditarDomicilios`). Guarda quién, tipo de actor (persona, sistema o IA), acción, ruta, y valor anterior y nuevo de cada campo |
| `…/aiInteractions/{id}` | M | Solo S (Etapa 9) |
| `…/outbox/{id}` (eventos para Make: `type`, `audiencia`, `plantilla`, `data`) | M | Solo S. Estados: `pendiente` → `enviado`, o `reintentar` (1, 2, 4… minutos, tope 6 h) → `fallido` a los 8 intentos. Sin URL configurada: `sin_destino`; apagado en Configuración: `apagado`. Los avisos programados usan id fijo (`tipo__clave`) para salir una sola vez. Detalle en `docs/AUTOMATIZACIONES.md` |
| `…/interesados/{id}` (web o admisión: nombre, email, teléfono, zona, estado) | M, A | S crea; M, A cambian el estado |
| `…/admisiones/{id}` (mensaje y respuestas de los formularios), `…/triage/{id}` (triage de urgencia), `…/transcripciones/{id}` (Plaud) | M | S crea; M marca triage leído o transcripción usada/descartada |
| `…/notifications/{id}` (la campana: `recipientUid`, `kind` `datos_familia`, `guardianId`, `campos`, `readAt`) | el destinatario | S. El destinatario solo marca `readAt` |

## Storage

| Ruta | Lee | Sube |
| --- | --- | --- |
| `orgs/{orgId}/patients/{patientId}/…` | M | M: PDF o imagen de menos de 20 MB, sin pisar un archivo existente |
| `orgs/{orgId}/materials/…` | M, A | M, con las mismas condiciones |
| Cualquier otra ruta | — | — |

La familia descarga con un enlace firmado de pocos minutos, que genera el servidor después de verificar que el documento está habilitado para ella (Etapa 5).

## Índices (`firestore.indexes.json`)

- Grupo `history` (turnos): `organizationId` + `atMs`.
- Grupo `followUps`: `status` + `dueAt`.
- Grupo `fever`: `reviewedAt` + `takenAt`.
- Grupo `outbox`: `status` + `nextAttemptAt`.
- Grupo `vaccineDoses`: `status` + `dueDate`.

## Primer médico en producción (cuando exista el proyecto real)

1. Crear el usuario en Firebase Authentication (email y contraseña) y activar el segundo factor (TOTP).
2. Asignarle el rol una sola vez, desde una terminal con permisos de administrador del proyecto. El procedimiento exacto se documenta al crear el proyecto. Desde ese momento, los demás roles se asignan con `asignarRol`.

## Pendiente de validación legal (no son afirmaciones legales)

- **Región:** `southamerica-east1` (San Pablo). Hay transferencia internacional de datos de salud.
- **Conservación y copias:** plazos de conservación, copias de seguridad de Firestore y Storage, eliminación e incidentes. Se documentan en la Etapa 10 como propuesta, para la revisión del Dr.
