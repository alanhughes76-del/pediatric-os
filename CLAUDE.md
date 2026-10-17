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
- Tests con jest-expo. `expo-modules-core` está mapeado en la config de jest a la copia anidada en `node_modules/expo`, porque instalarlo en la raíz choca con una dependencia opcional.

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
- Marca: "Dr. Alan Hughes · Pediatría a domicilio" (logotipo tipográfico).
- Colores base: #1B4D7E (principal), #2E6FA8, #3C87BE, #6FB3DA, #E8F3FA y #F4F8FB (fondos), #22415A (texto), #16324F (barra lateral).
- Colores de categoría (paleta aprobada el 17/10/2026, `categorias` en `theme.ts`): celeste, verde agua, lavanda, durazno y arena, en tonos suaves sin saturar. Cada uno tiene fondo, acento (íconos) y texto oscuro con contraste AA. Rojo únicamente para alertas.
- Única excepción: el botón de PacienteX es verde (#1F7A4D, `colors.contacto`), a pedido del Dr.
- Tipografías: Playfair Display (títulos) y Source Sans 3 (resto).
- Tono cálido y profesional, nada comercial. Botones grandes y pocos pasos (padres con un bebé en brazos).
- Contacto: **no hay WhatsApp en ningún lado**. Botón "Contactá al Dr. por PacienteX", que abre `CONFIG.pacienteXUrl` en el navegador del teléfono.
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
- **Calidad:** 232 tests (percentilos, plan por plazo, búsqueda, vista de familia para cada adulto, enlace mágico, certificados).
- **Pendiente para la etapa del backend (Vibecode Cloud):** base de datos y archivos reales, envío real del enlace mágico, subir el PDF del certificado al almacenamiento, conexión real con IA. Siguen sin tocar: Plaud, mails, Notion y firma digital.
- **Sin verificar por Claude:** la app en un iPhone real y el PDF generado en el teléfono.
