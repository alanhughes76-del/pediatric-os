# Verificación final · etapas A a E

Recorrido hecho el 16/10/2026 con los datos de ejemplo (todos ficticios), en el navegador con tamaño de teléfono, más las verificaciones automáticas.

**Verificaciones automáticas:** chequeo de tipos ✅ · linter ✅ · 227 tests ✅ · expo-doctor (21/21) ✅.
**No verificado por mí:** la app en un iPhone real, y el PDF generado en el teléfono (en la vista web solo se abre la impresión del navegador).

Referencias: ✅ cumplido · ⚠️ cumplido con una salvedad · ❌ no cumplido.

## Cómo trabajar

| Punto | Estado | Cómo se verificó |
| --- | --- | --- |
| Exploración, CLAUDE.md y plan por etapas antes de programar | ✅ | CLAUDE.md creado; plan aprobado antes del código |
| Una etapa por vez, con tipos, linter, tests, arranque y commit en español | ✅ | Commits `6bb18db` (base), `8d45f14` (A), `32f1bfc` (B), `9353a1b` (C), `3685662` (D), `95be519` (E) |
| No romper consulta, nota clínica, seguimientos ni fiebre | ✅ | Recorridos en esta verificación: consulta de Mateo (nota aprobada v1 con bandera), seguimientos en "Hoy", fiebre del médico y de la familia |
| No reescribir módulos ni borrar archivos sin preguntar | ⚠️ | Se borró `GraficoMediciones.tsx` con tu autorización. Se reescribieron dos módulos que el plan aprobado preveía rehacer: el motor de percentilos (etapa C) y la ficha del portal (etapa D) |
| Datos ficticios, sin backend | ✅ | Todo en memoria (`src/data/mock.ts`, `mockPacientes.ts`) |
| No tocar Plaud, IA real, mails, Notion ni firma digital | ✅ | Nada de eso se implementó; el borrador "con IA" sigue siendo de ejemplo |

## Reglas generales

| Punto | Estado | Cómo se verificó |
| --- | --- | --- |
| Español rioplatense con voseo, sin "tú" ni "vosotros" | ✅ | Búsqueda en el código: sin formas de "tú" |
| Marca, tipografías y tono | ✅ | Logotipo tipográfico, Playfair Display y Source Sans 3 |
| Solo azules y celestes; rojo solo para alertas | ⚠️ | Excepciones: el verde del botón de PacienteX (a tu pedido), un gris para textos secundarios y etiquetas neutras, y un rojo suave para las curvas P3/P97 (pedido en la etapa C) |
| Sin botón de WhatsApp; botón "Contactá al Dr. por PacienteX" con el link en la configuración | ✅ | Búsqueda en el código. "WhatsApp" aparece solo como el campo de teléfono del adulto, que pediste en el bloque Contacto |
| Nada clínico se borra, se archiva | ✅ | No hay ninguna operación de borrado en las escrituras; vínculos, domicilios y certificados se cierran, archivan o anulan |
| Toda acción sobre datos clínicos queda en la auditoría, que solo suma filas | ✅ | Todas las escrituras pasan por el store, que agrega una fila al registro de auditoría |

## Etapa A · Lista de pacientes

| Punto | Estado | Cómo se verificó |
| --- | --- | --- |
| Solapas Todos, Membresía, Cardales, Hepta, Esporádicos y Sin asignar, con su cantidad | ✅ | 40 · 12 · 9 · 8 · 7 · 4 en pantalla y en tests |
| En "Todos", etiqueta de ámbito en cada fila | ✅ | Recorrido |
| Orden alfabético por apellido; fila con apellido, nombre, edad y fecha de nacimiento | ✅ | Tests y recorrido |
| Buscador sin mayúsculas ni tildes: nombre, apellido, iniciales, fecha dd/mm/aaaa; dentro de la solapa activa | ✅ | Tests ("NUNEZ", "ruiz tomas", "trf", "15/09/2023") |
| "+ Nuevo paciente" con obligatorios y opcionales (ámbito, edad gestacional 22–44) | ✅ | Recorrido |
| Aviso si ya existe alguien con el mismo apellido y fecha, con opción de abrir el existente | ✅ | Recorrido con las mellizas Acosta |
| Tocar un paciente abre su ficha | ✅ | Recorrido |
| Aceptación: unos 40 pacientes, filtro y búsqueda al instante, conteos correctos | ✅ | 40 pacientes; 1000 búsquedas en 67 ms; conteos con tests |

## Etapa B · Ficha completa

| Punto | Estado | Cómo se verificó |
| --- | --- | --- |
| Encabezado: nombre, edad, edad gestacional, edad corregida si corresponde | ✅ | Emma: corregida; Tomás: no |
| Selector de ámbito que se guarda al cambiarlo | ✅ | Recorrido |
| Formato de edad: "2a 3m 5d" desde 12 meses, escrito antes, con fechas reales | ✅ | Solo del lado del médico, como elegiste; cálculo por calendario |
| 1. Contacto con "+ Cargar" y aviso de que sin email no hay portal | ✅ | Recorrido |
| 2. Adultos: buscar o crear, relación, principal, quitar vínculo, domicilios propios, visita al domicilio que corresponda, varios hermanos | ✅ | Recorrido (Lucía con Tomás y Emma; domicilio elegible en la consulta) |
| 3. Problemas: descripción, inicio, estado, resolución, "Lo ve la familia" apagado, "Marcar resuelto" y "Reabrir" | ✅ | Recorrido |
| 4. Alergias: alérgeno, reacción, gravedad, estado; regla visible; confirmadas en el encabezado de la ficha y de la consulta | ✅ | Recorrido |
| 5. Plan: categorías, fecha objetivo, "Marcar hecho" y "Reabrir", vencidos resaltados; la familia ve "Plan vigente" | ✅ | Recorrido |
| 6 a 9. Crecimiento, Consultas, Registro de fiebre (con sin revisar) y Certificados integrados | ✅ | Recorrido |
| Aceptación: cambiar el ámbito mueve de solapa sin recargar | ✅ | Tomás de Membresía (12 → 11) a Cardales (9 → 10) |
| Aceptación: un problema nuevo no aparece en el portal hasta prender el interruptor | ✅ | Recorrido y tests de la vista de familia |
| Aceptación: una alergia referida nunca aparece en el portal | ✅ | Recorrido (Emma) y tests para los 36 adultos |

## Etapa C · Crecimiento

| Punto | Estado | Cómo se verificó |
| --- | --- | --- |
| Datos OMS y SAP/Lejarraga del proyecto | ✅ | `src/data/referencias/` |
| Motor puro con tests; fórmula LMS (incluido L = 0); interpolación lineal; percentilo; curvas con los Z pedidos | ✅ | `src/lib/percentiles.ts` y sus tests |
| Fuera del rango: "fuera del rango de la referencia", sin extrapolar | ✅ | Tests |
| Referencia por defecto y selector para la otra | ✅ | Tests y selector en la tarjeta del médico |
| Talla acostado o de pie, corrección de 0,7 cm y campo "posición" con valor por defecto | ✅ | Tests; selector en la consulta |
| Prematuros: edad corregida hasta los 24 meses y puntos huecos | ✅ | Tests y gráfico de Emma |
| Sexo X: selector que se recuerda por paciente | ✅ | Recorrido |
| Avisos OMS: valor extremo (\|Z\| > 3) y probable error de carga (límites de plausibilidad) | ✅ | Tests |
| Los 6 casos de referencia (±0,02 en Z) | ✅ | Tests: los 6 dan bien |
| Casos borde: L = 0, fuera de rango, prematuro, 0,7 cm | ✅ | Tests |
| Tarjeta: indicadores, rangos 0–2, 0–5 y 2–19 años, curvas P3–P97 (P50 marcada, P3/P97 suaves), toque en un punto, tabla por visita | ✅ | Recorrido |
| La consulta usa el mismo motor; IMC automático | ✅ | Antropometría de la consulta |
| Familia: peso, talla y PC con bandas; sin Z, avisos ni tabla | ✅ | Recorrido (portal de Lucía) |

## Etapa D · Portal de la familia

| Punto | Estado | Cómo se verificó |
| --- | --- | --- |
| Enlace mágico de 15 minutos y un solo uso | ⚠️ | Simulado, como permitiste, con el punto de integración marcado en `src/lib/enlaceMagico.ts`. No se envían emails |
| Nadie se registra solo; "Puede entrar al portal" lo manejás vos, sea del ámbito que sea | ✅ | Recorrido (habilitaste a Diego, de Esporádicos) y tests |
| Registro de accesos: quién, cuándo y desde qué familia | ✅ | Recorrido |
| Inicio: "Hola, [nombre]", nombre de la familia, banner de membresía, selector de hijo, PacienteX siempre visible | ✅ | Recorrido (Lucía con selector, Paula sin selector) |
| Membresía vencida: lectura de todo, sin pedir visitas como miembro | ✅ | Recorrido (Carolina) con tu mensaje |
| Por hijo: informes (solo aprobadas), plan vigente, alergias y temas de salud ("En seguimiento"/"Resuelto"), crecimiento, fiebre y certificados | ✅ | Recorrido |
| Aceptación: ningún dato oculto en ninguna pantalla ni respuesta de datos, filtrado en la capa de datos | ✅ | `src/data/vistaFamilia.ts` + tests para los 36 adultos de ejemplo, con datos ocultos agregados a propósito |

## Etapa E · Certificados

| Punto | Estado | Cómo se verificó |
| --- | --- | --- |
| Cuatro tipos con su texto prearmado | ✅ | Tests |
| Formato "Certifico que…", DNI si está, edad, texto, a pedido de, ante; lugar y fecha; firma | ✅ | Tests y vista previa |
| Género por sexo (apto/apta) y redacción neutra con X | ✅ | Tests |
| Flujo: tipo, revisar y editar, vista previa, "Emitir" | ✅ | Recorrido |
| PDF con encabezado de la marca, guardado en Documentos con fecha y tipo | ⚠️ | El documento queda registrado con fecha y tipo. El PDF se arma cada vez que se abre, con el texto emitido, que no cambia; cuando haya backend, se sube al almacenamiento de archivos |
| Un certificado emitido no se edita; se anula con motivo y queda visible como "Anulado" | ✅ | Recorrido |
| La familia lo ve y lo descarga o comparte en PDF | ✅ | Recorrido (Paula) |
| Firma tipográfica y "Documento generado digitalmente" | ✅ | Tests del PDF |

## Decisiones que tomé sin preguntarte

**Generales**
- Botón de PacienteX verde (#1F7A4D), pedido por vos; un gris para textos secundarios y etiquetas neutras.
- Restauré `.claude/settings.json` de la plantilla, que había borrado sin querer en la primera entrega.
- Tests con jest-expo: se le indica dónde está `expo-modules-core` en lugar de instalarlo (instalarlo chocaba con otra dependencia).

**A · Lista**
- "Es otro paciente: guardar igual" en el aviso de duplicado, por las mellizas.
- La búsqueda también encuentra texto dentro del nombre ("tr" trae a Victoria Castro además de Tomás Ruiz).
- Cada fila muestra cuántos registros de fiebre faltan revisar.

**B · Ficha**
- "Quitar vínculo" pide un segundo toque y cierra el vínculo con la fecha de hoy.
- Los adultos nuevos arrancan sin acceso al portal.
- La pantalla de detalle de familia (`medico/familia/[id]`) quedó sin acceso desde la app: las familias se ven desde cada adulto.

**C · Crecimiento**
- Límites de plausibilidad para el PC: ±5, criterio OMS (la consigna no lo fijaba).
- Las mediciones anteriores a las 40 semanas de edad corregida no se grafican (la OMS no tiene referencia para esa edad).
- En peso/talla, en lugar de rangos de edad hay dos opciones: acostado (45–110 cm) o de pie (65–120 cm).

**D · Portal**
- Con la membresía vencida, "Pedí una visita" sigue visible y lleva al mensaje; la pantalla de urgencia también queda bloqueada.
- De los otros adultos de la familia, el portal muestra solo el nombre.
- El mensaje del ingreso por email es el mismo exista o no el email.

**E · Certificados**
- "Emitir" pide un segundo toque.
- El motivo de anulación no lo ve la familia; ve el certificado como "Anulado", sin descarga.
- Lugar por defecto: "Buenos Aires".
- La edad en el certificado va escrita ("3 años y 5 meses").

## Para probar en el iPhone

```
npx expo start --tunnel --clear
```

Lo que conviene mirar especialmente: el menú para guardar o compartir el PDF de un certificado, y cómo se ven las curvas de crecimiento en la pantalla del teléfono.

---

# Verificación del rediseño visual · etapas G a K

Recorrido hecho el 17/10/2026 con los datos de ejemplo, en el navegador en dos tamaños: computadora (1280 px) y teléfono (375 px). Referencia: la imagen tipo tablero de Pediatric OS que mandó el Dr.

**Verificaciones automáticas:** chequeo de tipos ✅ · linter ✅ · 232 tests ✅ · expo-doctor (21/21) ✅.
**No verificado por mí:** la app en un iPhone o una tablet reales.

| Punto | Estado | Cómo se verificó |
| --- | --- | --- |
| Plan por etapas aprobado; paleta aprobada antes de programar | ✅ | Plan G–K y paleta mostrados y aprobados; commits `0051d3e` (G), `95e4ee0` (H), `c59bb90` (I), `29eb32e` (J) |
| Paleta más colorida, sin saturar, con contraste ideal | ✅ | `categorias` en `theme.ts`; todo texto sobre fondo de color mide 5,6:1 o más (norma AA pide 4,5:1) |
| Rojo solo para alertas; verde intenso solo para PacienteX | ✅ | Revisado en cada pantalla; el verde agua solo se usa como fondo suave |
| Versión web para médico y familias | ✅ | Barra lateral y barra superior desde 1024 px; en el teléfono, pestañas de siempre |
| Módulos inexistentes como "Próximamente", sin abrirse | ✅ | Agenda, Prescripciones, Estudios, Comunicaciones, Reportes e IA Asistente en gris en la barra lateral del médico |
| Nombre actual de la app en la barra lateral | ✅ | "Dr. Alan Hughes · Pediatría a domicilio" |
| Ficha del paciente como tablero | ✅ | Tomás, Olivia y Emma: encabezado, solapas, Resumen, plan por plazo; las solapas usan los bloques de antes |
| "Hoy" y lista de pacientes con el estilo nuevo | ✅ | Cifras del día, visitas y seguimientos en dos columnas; lista en dos columnas |
| Portal de la familia con el mismo estilo | ✅ | Lucía (dos hijos) y Carolina (membresía vencida) |
| Sin datos inventados (grupo sanguíneo, foto, medicación) | ✅ | La ficha muestra solo datos que existen; iniciales en lugar de foto |
| Sin WhatsApp como contacto | ✅ | El contacto sigue siendo PacienteX. "WhatsApp" aparece solo como nombre del campo de teléfono del adulto (lo pediste en el bloque Contacto) |
| No romper consulta, nota clínica, seguimientos y fiebre | ✅ | Ningún archivo de esos módulos ni de la capa de datos (`store`, `vistaFamilia`, `types`) cambió en G–K. Recorrido: Carolina anotó 38,6 °C → al médico le aparece en "Fiebre" y en la cifra de "Hoy"; seguimiento de Mateo; consulta del día con su nota |
| Lo que ve la familia no cambió | ✅ | `vistaFamilia` sin cambios; sus tests siguen pasando para los 36 adultos |
| Membresía vencida bloquea "Pedir visita" | ✅ | Carolina: muestra "Tu membresía venció. Para pedir una visita, contactame por PacienteX." |
| No borrar archivos ni reescribir módulos sin preguntar | ⚠️ | No se borró ningún archivo. Se rehicieron tres pantallas que el plan aprobado preveía rediseñar: "Hoy", la ficha del portal (`FichaHijo`) y el armado de la ficha del médico (`FichaPaciente`); la lógica de cada bloque no cambió |

## Decisiones que tomé sin preguntarte (G a K)

- La barra lateral aparece desde 1024 px de ancho: computadora o tablet apaisada. Una tablet vertical usa las pestañas del teléfono.
- No puse la campana de avisos de la imagen, porque la app todavía no tiene avisos.
- En la ficha agregué la solapa "Datos y familia" (DNI, ámbito, contacto y adultos), que la imagen no tiene pero la ficha sí necesita. Vacunas va junto con el plan, en "Plan y vacunas".
- Colores por categoría del plan: control celeste, vacuna verde agua, prevención durazno, otro lavanda. Plazos: Hoy celeste, Próximos 30 días arena, Próximos meses lavanda, Prevención durazno.
- Colores por ámbito en las iniciales: Membresía celeste, Cardales verde agua, Hepta lavanda, Esporádico durazno, Sin asignar arena.
- "Próximas acciones" muestra seguimientos, fiebre sin revisar y el plan de hoy y de los próximos 30 días.
- La ficha abre siempre en "Resumen".
- Al girar la tablet o cambiar el ancho de la ventana, la pantalla abierta no se pierde.

## Después de la verificación

- El botón de contacto pasó a decir "Escribime por PacienteX" (elegido por el Dr.): entra en un renglón en el teléfono.

# Etapa 10a · Pruebas de aceptación (sección 11 del prompt maestro)

Corridas el 18/10/2026 sobre los emuladores de Firebase con los datos de demostración (todos ficticios). Cada prueba dice cómo se corrió: con un test automático (que vuelve a correr en cada etapa) o recorriendo la app en el navegador, conectada a los emuladores. La familia de prueba que se creó en el recorrido es "Acepta Prueba", con datos inventados.

**Suites:** chequeo de tipos ✅ · linter ✅ · app 373 tests ✅ · Functions 72 ✅ · reglas 83 ✅ · integración en el emulador 55 ✅.

| # | Prueba | Estado | Cómo se verificó |
| --- | --- | --- | --- |
| 1 | Familia con dos adultos en domicilios distintos | ✅ | Navegador: familia nueva con Carla (Olivos) y Martín (Tigre). Ver la salvedad en "Hallazgos" |
| 2 | Dos hijos en la misma familia, sin duplicar | ✅ | Navegador: Bruno y Lola en la familia; el mismo DNI escrito con puntos se rechaza ("Ya hay un paciente con ese DNI… Abrir el existente"). Test `integracion/pacientes` |
| 3 | Turno confirmado y otro superpuesto rechazado por el servidor | ✅ | Test `integracion/turnos` ("otro confirmado que se pisa: el servidor lo rechaza"; dos confirmaciones a la vez: solo una gana) |
| 4 | Reprogramar y cancelar, con historial | ✅ | Test `integracion/turnos`. Navegador: reprogramación de 23/10 a 26/10 con el calendario nuevo; el historial muestra "De 23/10 10:00 a 26/10 10:00" |
| 5 | Reserva simulada de Cal.com como "solicitado" | ✅ | Test `integracion/turnos` (con DNI conocido, desconocido, cancelada, firma inválida) |
| 6 | Consulta completa: percentilos, hitos, nota sin IA, aprobar y corregir | ✅ | Navegador (Lola): peso P53, talla P44 (de pie), IMC P59 mientras se escribe; un hito marcado; con la IA apagada el botón explica por qué y se escribe a mano; aprobada v1, corregida y aprobada v2 ("Historial de versiones (2)"). Test `integracion/clinica` |
| 7 | Modificar una nota aprobada escribiendo en la base: lo impiden las reglas | ✅ | Test `reglas/firestore` ("una nota aprobada no se puede modificar escribiendo directo en la base") |
| 8 | Nota con bandera en Seguimientos pendientes, con el vencimiento correcto | ✅ | Navegador: Lola aparece en Inicio con "Control · Vence en 48 h". Test `integracion/clinica`: urgencia a las 24 h |
| 9 | Tests de percentilos de la sección 7.6 | ✅ | `src/lib/percentiles.test.ts`: los seis casos de la tabla (±0,02 en Z), L = 0, fuera de rango, prematuro y corrección de 0,7 cm |
| 10 | Esquema de un recién nacido con el calendario sin verificar | ✅ | Navegador: Bruno (nacido hoy) muestra "Calendario sin verificar: fechas estimadas". Tests `funciones/programados` e `integracion/eventos`: sin recordatorios de vacunas mientras no esté verificado |
| 11 | Emitir un certificado, anularlo y emitir otro | ✅ | Test `integracion/clinica` (sumé el paso "emitir otro": el anulado queda anulado y el nuevo, emitido) |
| 12 | Portal como cada adulto: solo lo habilitado; problema oculto y alergia referida ausentes | ✅ | Navegador: Lucía ve a Tomás y a Emma, sin el soplo (oculto) ni la alergia referida; Paula ve solo a Olivia; Diego (sin acceso) recibe la respuesta neutra y ningún enlace. Tests `integracion/portal` (leyendo la base directo) y `reglas/firestore` |
| 13 | Fiebre cargada desde el portal, "sin revisar" del lado médico | ✅ | Navegador: Lucía anotó 38,2 °C axilar de Tomás; en el Registro de fiebre del médico figura como último valor, con 7 sin revisar |
| 14 | El botón de PacienteX abre el link configurado fuera de la app | ✅ | Navegador: abre `familias.somospacientex.com/…` en una pestaña nueva y la app queda donde estaba |
| 15 | Sin rol o con rol asistente no se leen datos clínicos | ✅ | Test `reglas/firestore` (asistente, familia, sin rol, otro consultorio y sin sesión) |
| 16 | Evento que sale firmado hacia un webhook de prueba, con reintento | ✅ | Test `funciones/outbox`, contra un servidor HTTP local: firma `sha256=…` verificable, reintento ante error y ante falta de respuesta, tope de intentos |
| 17 | Recorrido en computadora y celular, con errores de validación y estados vacíos | ⚠️ | Navegador a 1024 px y a 375 px: 31 pantallas del médico sin desborde horizontal ni errores; validaciones vistas ("Escribí tu email y tu contraseña", "Escribí el apellido de la familia", "Elegí el sexo"); estados vacíos en la familia nueva y en la ficha. Salvedad: el portal a 375 px no se recorrió de nuevo en esta pasada (se hizo en la Etapa 6b), y nada de esto es un iPhone real |

## Hallazgos y arreglos (10a)

- **Arreglado:** cuatro pantallas volvían atrás sin fijarse si había adónde (vincular adulto, fiebre del médico, fiebre de la familia y resolver seguimiento). Abiertas desde un enlace directo, quedaban trabadas con un error. Ahora vuelven a la ficha, a Inicio o al portal.
- **Arreglado:** las casillas (hitos, bandera clínica) y los interruptores no tenían nombre para los lectores de pantalla.
- **Arreglado:** el texto de la foto del paciente decía que llegaba "con el almacenamiento de archivos", que ya existe. Ahora dice que todavía no se puede cargar.
- **Resuelto con el Dr.:** al cargar un hijo dentro de una familia no se vinculaba solo a los adultos de esa familia. Ahora el alta los muestra tildados, con la relación copiada de los hermanos (si no hay de dónde copiarla, la elige el Dr.), y el contacto principal de los hermanos. Probado en el navegador: Nina quedó con Lucía (Madre, principal) y Martín (Padre). Sigue sin haber "Sumar un adulto" en la pantalla de la familia: los adultos nuevos se suman desde cada hijo.

## No verificado

- La app en un iPhone real con Expo Go (en esta etapa y en las anteriores).
- Mails reales (faltan `SMTP_USUARIO` y `SMTP_CLAVE`), envío real a Make (falta `MAKE_WEBHOOK_URL`), reservas reales de Cal.com y una respuesta real de la IA (falta `ANTHROPIC_API_KEY` y la revisión legal del consentimiento).

## Diseño de Lovable (etapas D1 a D4, 28/10/2026)

| Punto | Estado | Cómo se verificó |
|---|---|---|
| Paleta G y tipografía Manrope/Caveat en toda la app | ✅ | Ningún color suelto fuera de `src/theme.ts`, salvo el blanco y negro del código QR (tiene que ser así para que se lea) y el rosado de los extremos de las curvas |
| Contraste AA de todas las combinaciones nuevas | ✅ | 41 combinaciones medidas: texto, texto atenuado, azul noche y rojo de alerta sobre los cinco pasteles (4,5:1 o más); íconos sobre pastel y sobre blanco (3:1 o más); barra lateral, botón de acción, PacienteX y saludo manuscrito |
| Marca "Dr. Alan Hughes - Pediatría Integral" en las dos caras | ✅ | Barra lateral del médico, ingresos, portal y autenticador del segundo factor |
| Botones, campos, solapas y pestañas en píldora; tarjetas de 28 px; manchas de fondo | ✅ | Navegador a 1280 px y a 375 px |
| Pantallas clave (Inicio del médico, ficha, Inicio del portal, ingresos) | ✅ | Navegador a 1280 px y a 375 px, sin errores en la consola. También Agenda, Certificados, Configuración y la curva de crecimiento |
| Tipos, linter y tests | ✅ | `npx tsc --noEmit`, `npx eslint src`, 388 tests |
| Fuente Inter | ✅ | Ya no se usaba: se quitó `@expo-google-fonts/inter` |

Pendiente de decidir con el Dr.: el diseño de los certificados en PDF (`lib/certificadoPdf.ts` y `functions/src/certificadoPdf.ts`) conserva sus colores y letras propios; no se tocó porque es un documento que sale de la app.

No verificado: la app en el iPhone con Expo Go.
