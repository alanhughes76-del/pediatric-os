# Dr. Alan Hughes · Pediatría a domicilio

App móvil (iOS y Android) de la práctica de pediatría a domicilio del Dr. Alan Hughes (Zona Norte y CABA). Es su historia clínica y el portal de las familias. Reemplaza al prototipo web Pediatric OS.

Dos roles: el médico (único usuario) y las familias, donde cada adulto responsable tiene su propio acceso.

Ver también `AGENTS.md` (guía de Expo: usar `npx expo install`, docs versionadas, Expo Router).

## Stack

- Expo SDK 57 + React Native 0.86 + TypeScript, Expo Router (rutas en `src/app/`).
- **SDK 57 a propósito**: es la versión que corre el Expo Go del iPhone del Dr. No subir de SDK sin preguntarle.
- Sin backend: datos de ejemplo **ficticios** en memoria (`src/data/mock.ts`). Se reinician al recargar la app. Vibecode Cloud (base de datos, autenticación y archivos) llega en la etapa del backend.
- Gráficos con `react-native-svg`. Tipografías Playfair Display y Source Sans 3 (`@expo-google-fonts`).
- Probar en el teléfono: `npx expo start --tunnel --clear` y abrir en Expo Go. `@expo/ngrok` está instalado en el proyecto, porque la instalación global falla por permisos.

## Estructura

```
src/
  app/            Pantallas (Expo Router)
    index.tsx       Selector de rol (modo prueba; reemplaza al login hasta tener backend)
    familia/        Portal de la familia: (tabs) Inicio, Pedir visita, Fiebre, Membresía; hijo/[id], fiebre/, urgencia
    medico/         Médico: (tabs) Hoy, Pacientes, Fiebre, Membresías; hijo/[id] (ficha), paciente/nuevo, adulto/[id], adulto/vincular, consulta/[id], seguimiento/[id], fiebre/, familia/[id]
  components/     Componentes de interfaz: ficha/ (ficha completa del médico), consulta/, fiebre/, formularios.
                  FichaHijo.tsx es la ficha del portal de la familia (se limpia en la etapa D).
  data/
    types.ts        Modelo de datos (una interfaz = una tabla)
    mock.ts         Datos de ejemplo ficticios
    mockPacientes.ts  33 pacientes ficticios más (40 en total) para la lista
    store.tsx       Estado en memoria + sesión simulada; escrituras con auditoría
    selectores.ts   Lecturas y reglas de visibilidad para la familia
    referencias/    oms_lms.json, argentina_lms.json, hitos_desarrollo.json
  lib/            Lógica pura: percentiles (LMS), busqueda (lista de pacientes), edad, fechas, hitos, fiebre, notaIA (borrador de ejemplo)
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
2. Una etapa por vez. Al terminar cada una: chequeo de tipos (`npx tsc --noEmit`), linter (`npx eslint src`) y tests; verificar que la app arranque sin errores; commit con mensaje en español; contar en pocas líneas qué cambió y cómo probarlo en el teléfono; esperar su OK.
3. No romper lo que ya funciona: consulta, nota clínica, seguimientos y registro de fiebre. No reescribir módulos enteros ni borrar archivos sin preguntar.
4. Si hay backend, usarlo; si no, seguir con datos ficticios. Nunca cargar datos reales de pacientes.
5. Si algo choca con lo construido o no está claro: preguntar antes. No inventar datos clínicos.
6. No tocar todavía: importación de Plaud, conexión real con IA, envío de mails, sincronización con Notion, firma digital.
7. Ante la duda entre dos soluciones, la más simple.

## Reglas generales

- Interfaz en español rioplatense con voseo ("Cargá", "Tocá"). Nunca "tú" ni "vosotros".
- Marca: "Dr. Alan Hughes · Pediatría a domicilio" (logotipo tipográfico).
- Colores: #1B4D7E (principal), #2E6FA8, #3C87BE, #6FB3DA, #E8F3FA y #F4F9FC (fondos), #22415A (texto). Solo azules y celestes; rojo únicamente para alertas.
- Única excepción: el botón de PacienteX es verde (#1F7A4D, `colors.contacto`), a pedido del Dr.
- Tipografías: Playfair Display (títulos) y Source Sans 3 (resto).
- Tono cálido y profesional, nada comercial. Botones grandes y pocos pasos (padres con un bebé en brazos).
- Contacto: **no hay WhatsApp en ningún lado**. Botón "Contactá al Dr. por PacienteX", que abre `CONFIG.pacienteXUrl` en el navegador del teléfono.
- La app nunca sugiere dosis ni diagnósticos a las familias.

## Estado

- Hecho: dos roles con selector de prueba; Inicio de la familia; consulta (antropometría con percentilos LMS, hitos CDC/AAP + PRUNAPE, nota clínica versionada con borrador de ejemplo); seguimientos pendientes; registro de fiebre de los dos lados; plan de cuidado con tildado y "Vacunas aplicadas".
- Etapa A (lista de pacientes) hecha: solapas por ámbito con conteo, orden por apellido, búsqueda sin tildes (nombre, iniciales, fecha) y alta con aviso de duplicado.
- Etapa B (ficha completa) hecha: encabezado con ámbito y alergias, Contacto, Adultos responsables (pantalla de adulto con domicilios y hermanos; vincular existente o nuevo), Problemas ("Lo ve la familia", resolver y reabrir), Alergias, Plan (vencidos resaltados), Crecimiento, Consultas, Fiebre y Documentos. Domicilio de la visita elegible en la consulta. Edad abreviada ("2a 3m 5d") solo del lado del médico.
- Pendiente: etapas C (crecimiento), D (portal), E (certificados) y F (verificación final).
- Preguntas abiertas del Dr.: DNI opcional (E), qué pasa en "Pedir visita" con la membresía vencida (D).
