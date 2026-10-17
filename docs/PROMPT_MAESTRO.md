# PROMPT MAESTRO — Pediatric OS
## Plataforma integral de la práctica del Dr. Alan Hughes · web y mobile

Versión 1 · 17/10/2026. Este documento reemplaza a todos los pedidos anteriores. Donde algo de un pedido anterior choque con este documento, gana este documento.

---

## 0. Cómo usar este documento

Sos un equipo senior: Product Manager, arquitecto de software, especialista en Firebase y React Native/Expo, desarrollador full-stack, diseñador UX/UI y especialista en seguridad de aplicaciones de salud. Trabajás para mí, el Dr. Alan Hughes, pediatra.

Archivos que acompañan este documento:

| Archivo | Qué es |
| --- | --- |
| `docs/referencia-ui.png` | La pantalla de la ficha del paciente tal como me imagino la plataforma. Es la referencia visual obligatoria. |
| `assets/data/oms_lms.json` | Tablas LMS OMS 2006/2007 (peso, talla, PC, IMC y peso/talla). |
| `assets/data/argentina_lms.json` | Tablas LMS SAP/Lejarraga 2009 (peso y talla). |
| `assets/data/hitos_desarrollo.json` | Hitos del desarrollo CDC/AAP 2022 por edad y área, recordatorios de tamizaje y pautas PRUNAPE de 5 años. |
| `assets/data/calendario_vacunas.json` | Calendario de vacunas obligatorias. **Es un borrador que yo tengo que verificar** antes de usarlo con pacientes reales. |

Reglas para leer este documento:

1. Leelo completo antes de hacer nada.
2. Los datos clínicos salen de estos archivos o de mí. Nunca inventes datos clínicos, dosis, esquemas ni referencias.
3. El contenido de ejemplo que aparece en la imagen (nombres, vacunas, edades, valores) es ilustrativo. No lo copies como dato.
4. Si algo no está claro o se contradice, preguntame antes de construirlo.

---

## 1. Qué es el proyecto

Soy pediatra en Argentina. Atiendo en domicilio, en CABA y GBA Zona Norte, a niños de 0 a 18 años y a sus familias. Trabajo solo. El servicio se posiciona como **pediatría de dedicación exclusiva**: tiempo para escuchar, seguimiento a lo largo del tiempo, prevención y atención en el hogar. No es un servicio masivo de visitas ni una plataforma de emergencias.

Además de la membresía, atiendo pacientes en otros ámbitos: Cardales (mi consultorio en Los Cardales), Hepta y pacientes esporádicos.

**Pediatric OS** es mi plataforma de trabajo. Reúne en una sola interfaz:

- La agenda y la central de turnos de las visitas a domicilio.
- La historia clínica de todos mis pacientes, de todos los ámbitos.
- El seguimiento: crecimiento, desarrollo, vacunas, estudios, plan de cuidado y prevención.
- La gestión de familias, membresías y pagos.
- El portal de las familias.
- Los eventos que alimentan mis automatizaciones de Make.

Tiene que funcionar en computadora (web) y en el celular (app), con un solo código.

Criterio de éxito: puedo trabajar un día entero (agenda, visitas, historia clínica, seguimiento y comunicación con las familias) sin salir de Pediatric OS, con menos tareas administrativas, sin errores de coordinación y con los datos de los chicos protegidos.

---

## 2. Punto de partida

- El repositorio es el proyecto que exporté de Vibecode: una app React Native / Expo. Puede que ya tenga partes de pedidos anteriores (roles médico y familia, portal, consulta, nota clínica, seguimientos, registro de fiebre, crecimiento, certificados). No asumas qué está hecho: verificalo.
- La versión web sale del mismo código (Expo con soporte web / React Native Web). Si encontrás un motivo técnico serio para no hacerlo así, explicámelo antes de cambiar el enfoque.
- Backend: **Firebase**. Usá Authentication, Cloud Firestore, Cloud Functions, Cloud Storage, Security Rules y App Hosting (o un hosting compatible) para la web. Si el proyecto ya usa otro backend (por ejemplo Vibecode Cloud o Supabase), no migres nada: contame qué hay, qué costaría pasar a Firebase y qué recomendás. La decisión es mía.
- Si todavía no hay un proyecto de Firebase configurado, armá la estructura, usá los emuladores de Firebase para desarrollar y documentá los pasos de conexión. No simules una conexión real.

---

## 3. Principios que no se negocian

1. **Privacidad desde el diseño.** Son datos de salud de menores (Ley 25.326 de datos personales y Ley 26.529 de derechos del paciente e historia clínica).
   - Recolectá solo lo necesario para cada función.
   - Nunca expongas datos personales en URLs, logs técnicos ni notificaciones push.
   - Ningún recordatorio, correo de aviso ni mensaje automático lleva información clínica. La única excepción es el resumen para la familia que yo apruebo explícitamente.
2. **Seguridad en el servidor.** Los permisos y las validaciones críticas (roles, visibilidad para la familia, superposición de turnos, inmutabilidad de la historia clínica) viven en Security Rules y Cloud Functions, nunca solo en la interfaz.
   - Sin claves privadas ni credenciales en el frontend.
   - Sin reglas abiertas fuera del emulador.
3. **La historia clínica no se borra ni se reescribe.**
   - Nada clínico se borra físicamente: se archiva.
   - Una nota aprobada es inmutable; se corrige con una versión nueva.
   - Todo cambio relevante queda en un registro de auditoría que solo suma filas: quién, qué, cuándo, valor anterior y nuevo, y si lo hizo una persona, el sistema o la IA.
4. **Datos ficticios.** Durante el desarrollo, todos los datos son de demostración, claramente marcados como tales y separados de cualquier dato real. Nunca cargues datos reales de pacientes.
5. **Honestidad técnica.**
   - No presentes como conectado algo que no lo está.
   - Marcá siempre qué está implementado, qué usa datos de prueba y qué requiere configuración mía.
   - No declares superada una prueba que no corriste.
6. **La IA propone, yo decido.** Nada generado por IA llega a una familia ni entra en la historia clínica sin mi revisión explícita.
7. **No es un servicio de emergencias.** La plataforma nunca lo sugiere. Ante señales de alarma, deriva siempre a la guardia o al SAME 107.
8. **Simplicidad.** Si dudás entre dos soluciones, elegí la más simple para mí y para las familias. No agregues funciones que no estén pedidas acá.
9. **Idioma.** Toda la interfaz en español rioplatense con voseo ("Cargá", "Tocá", "Pedí"). Nunca "tú" ni "vosotros". El código y los nombres técnicos pueden ir en inglés.

---

## 4. Usuarios y permisos

| Rol | Quién | Qué puede hacer |
| --- | --- | --- |
| Médico (administrador) | Yo, un único usuario por ahora | Todo. |
| Familia | Cada adulto responsable, con su propio acceso | Ver solo los datos de sus hijos que yo habilité. Pedir visitas, cargar el registro de fiebre, actualizar sus datos de contacto y descargar documentos. |
| Asistente administrativo (futuro) | Personal que pueda sumar más adelante | Agenda, turnos, familias, membresías y pagos. **Nunca** datos clínicos. |

- Los permisos se implementan en el backend (custom claims de Auth y Security Rules).
- El rol de asistente queda preparado en el modelo y en las reglas desde el principio, aunque hoy no haya ningún usuario con ese rol. Así se puede sumar sin rediseñar.
- Mi acceso: email y contraseña con segundo factor si Firebase lo permite en el plan que corresponda. Proponeme la opción más segura y de menor costo.
- Acceso de las familias:
  - Ingreso por email con enlace mágico, que vale 15 minutos y se usa una sola vez.
  - Nadie se registra solo: yo habilito o deshabilito a cada adulto desde su ficha, sea del ámbito que sea.
  - Sin email cargado no se puede habilitar el acceso.

---

## 5. Diseño y navegación

### 5.1 Estética

Seguí `docs/referencia-ui.png`.

**Colores.** Estos valores son aproximados: afinalos contra la imagen y documentalos en un único archivo de tokens.
- Barra lateral azul marino (≈ #1E2B4D).
- Azul intenso para la acción principal (≈ #2F6FED).
- Fondo gris azulado muy claro (≈ #F5F8FC) y tarjetas blancas.
- Un color pastel suave por sección: celeste para crecimiento y agenda, rosado para vacunas y próximas acciones, verde para lo que está al día, violeta para la IA, naranja para prevención.
- El rojo intenso queda reservado para alertas.
- Un botón verde, solo para el acceso a PacienteX (sección 7.19).

**Tipografía.** Una sans moderna como la de la imagen (por ejemplo Inter), con buena jerarquía de tamaños.

**Tono.**
- Profesional, cálido y tranquilo: confianza médica y cercanía.
- Sin estética de guardería y sin estética de software hospitalario genérico.
- En la marca del lado médico: "Pediatric OS", con el subtítulo "Cuidando hoy su mañana". La frase "Pequeños pacientes, grandes historias" va en el encabezado, como en la imagen.
- En el portal de las familias, la marca es "Dr. Alan Hughes · Pediatría a domicilio".

**Accesibilidad.**
- Contraste AA.
- Áreas táctiles de al menos 44 px.
- Estados de foco visibles.
- Nunca el color como único portador de información.

**Estados.** Cada pantalla tiene estados de carga, vacíos, de error comprensible y de confirmación antes de acciones destructivas.

### 5.2 Estructura (web / tablet)

- **Barra lateral izquierda:** Inicio · Agenda · Pacientes · Familias · Historia clínica · Consultas · Prescripciones · Estudios · Vacunas · Crecimiento · Certificados · Prevención · Comunicaciones · Documentos · Reportes · IA Asistente. Abajo van mi perfil, Configuración y Cerrar sesión.
- **Encabezado:** buscador global (paciente, familia o DNI), campana de avisos con contador, mi nombre y la frase de marca.
- **Ficha del paciente,** como en la imagen:
  - **Encabezado:**
    - Foto (opcional) o iniciales.
    - Nombre.
    - Edad, peso y talla de la última medición.
    - Grupo sanguíneo, si está cargado.
    - Fecha de nacimiento y DNI.
    - Chips: familia, cobertura (prepaga u obra social), estado de alergias ("Sin alergias conocidas" o las confirmadas, en rojo) y tipo de seguimiento.
    - Botones "Nueva consulta" y "Acciones rápidas".
    - Tarjeta "Próximo turno" con acceso a la agenda.
  - **Pestañas:** Resumen · Historia clínica · Consultas · Crecimiento · Vacunas · Medicaciones · Estudios · Documentos · Comunicaciones · Plan de cuidado.
  - **Pestaña Resumen,** con tarjetas:
    - Resumen clínico: antecedentes relevantes, alergias, medicación actual y problemas activos.
    - Última consulta: motivo, examen físico y conducta.
    - Próximas acciones: próximo control, vacuna pendiente, estudio pendiente y educación para la salud.
    - Crecimiento: mini gráfico con el último percentilo.
    - Vacunas.
    - Estudios.
    - Prescripciones activas.
    - Documentos.
    - Comunicaciones recientes.
    - Plan de cuidado, en columnas Hoy / Próximos 30 días / Próximos meses / Prevención.
    - Panel de IA Asistente.
  - Cada tarjeta tiene su enlace "Ver todo" a la pestaña o al módulo correspondiente.

### 5.3 Adaptación a celular

- La barra lateral se reemplaza por una barra inferior con Inicio · Agenda · Pacientes · Avisos · Más. "Más" abre el resto de los módulos.
- Las pestañas de la ficha pasan a una fila deslizable.
- Las tarjetas se apilan en una columna, en el mismo orden.
- La IA Asistente pasa a un botón flotante que abre una hoja inferior.
- La agenda y la creación de turnos tienen que ser especialmente cómodas en el celular: las uso en la calle, entre visita y visita.
- El portal de las familias se diseña primero para celular: los padres lo usan con un bebé en brazos. Botones grandes y pocos pasos.

---

## 6. Reglas de negocio

**Agenda y turnos**
1. La agenda representa mi disponibilidad real: horarios de atención, bloqueos, duración por tipo de visita y un buffer de traslado entre visitas, todo configurable.
2. Un turno confirmado nunca se superpone con otro turno confirmado (incluido el buffer). Se valida en el servidor con una transacción, no solo en pantalla.
3. Una solicitud de turno no es una confirmación. Toda solicitud entra como "solicitado" y la confirmo yo.
4. Toda modificación de un turno actualiza su estado y deja un registro del cambio.
5. La dirección de la visita puede diferir de la dirección habitual de la familia. Cambiarla en un turno no modifica la dirección guardada.
6. La zona de cobertura es configurable. Hoy es "CABA y GBA Zona Norte". Un turno fuera de zona genera un aviso, no un bloqueo.

**Familias y pacientes**
7. Una familia puede tener varios pacientes. Cada paciente está vinculado al menos a un adulto responsable. Los adultos pueden vivir en domicilios distintos.
8. No se crean pacientes duplicados: antes de guardar, se compara por DNI y por apellido más fecha de nacimiento.

**Membresía**
9. Una membresía no da consultas ilimitadas ni disponibilidad garantizada. Las condiciones (qué incluye, prioridad, tiempos de respuesta, precio, descuento por hermano) se definen en Configuración y no se deducen de que exista una membresía.

**Historia clínica**
10. La familia ve solo lo que yo habilito: resúmenes de notas aprobadas, alergias confirmadas, los problemas que hice visibles, el plan vigente, las curvas, las vacunas, los documentos y certificados emitidos y su propio registro de fiebre. Nunca ve hallazgos clínicos, conducta, notas internas, borradores ni alergias referidas. Ese filtro se aplica en las Security Rules y en la forma de guardar los datos, no solo en la interfaz.
11. Las recetas y las órdenes de estudios con validez legal se emiten en una plataforma inscripta en el Registro Nacional de Plataformas Digitales de Salud (ReNaPDiS), como exige la normativa vigente. Pediatric OS **no emite recetas ni órdenes legales**: registra lo indicado, enlaza a la plataforma que uso y guarda el PDF.

---

## 7. Módulos

En cada módulo: hacé lo que se describe, respetá las reglas y cumplí los criterios de aceptación.

### 7.1 Inicio (tablero)

- Turnos de hoy en orden, con dirección y acceso directo a la ficha y a "Cómo llegar" (Google Maps o Waze).
- Agenda de los próximos días.
- Solicitudes nuevas y turnos pendientes de confirmar.
- **Seguimientos pendientes** (ver 7.5), con los vencidos en rojo.
- Avisos:
  - Registros de fiebre sin revisar.
  - Estudios con resultado a revisar.
  - Vacunas atrasadas.
  - Membresías por renovar.
  - Pagos vencidos.
- Accesos rápidos: nuevo turno, nueva familia, nuevo paciente y nueva consulta.
- Visitas realizadas y cancelaciones de la semana.
- No inventes indicadores: solo mostrá lo que sale de datos reales del sistema.

### 7.2 Agenda y central de turnos

- Vistas diaria, semanal y mensual. En el celular, la vista diaria es la principal.
- Cada turno tiene:
  - Identificador único.
  - Fecha, hora de inicio y duración (o hora de fin).
  - Tipo: control, urgencia día, urgencia noche, seguimiento, recién nacido o prenatal.
  - Modalidad: domicilio, telemedicina u otro.
  - Familia y paciente o pacientes. Los hermanos pueden ir en la misma visita.
  - Dirección de la visita y zona.
  - Motivo general, limitado a lo necesario para organizar la visita.
  - Estado.
  - Notas operativas visibles solo para el médico y el asistente.
  - Origen: médico, portal, Cal.com o formulario web.
  - Fechas de creación y última modificación.
- Estados: solicitado → pendiente de confirmación → confirmado → realizado, más cancelado y ausente.
- Acciones: crear, editar, reprogramar, confirmar, cancelar (con motivo), marcar realizado, marcar ausente, "Estoy en camino" y ver el historial de cambios.
  - "Estoy en camino" emite un evento para que Make avise a la familia.
  - "Marcar realizado" ofrece abrir la consulta.
- Avisos al crear o mover un turno:
  - Superposición: bloquea si los dos turnos están confirmados.
  - Fuera de horario.
  - Fuera de zona.
  - Buffer de traslado insuficiente.
- Reservas de Cal.com (transición): mientras siga activo Cal.com, cada reserva entra por un endpoint (webhook) como turno "solicitado", vinculado al paciente por DNI cuando coincide. Si no coincide, queda como "familia por identificar". Más adelante, la reserva desde el portal reemplaza a Cal.com.
- Aceptación:
  - Dos turnos confirmados superpuestos son rechazados por el servidor aunque se fuerce la interfaz.
  - Reprogramar deja rastro en el historial.
  - Un turno cancelado libera el horario.

### 7.3 Familias

- Datos de la familia:
  - Nombre de la familia.
  - Adultos responsables, cada uno con nombre, relación, teléfono (guardado en formato E.164, `+549…` para Argentina, normalizando lo que se escriba con o sin 0, 54 o 9), email, preferencia de contacto, direcciones y acceso al portal.
  - Zona.
  - Estado: activa o inactiva.
  - Membresía (ver 7.16).
- Ficha de la familia:
  - Hijos.
  - Próximos turnos.
  - Historial de visitas.
  - Membresía y pagos.
  - "Quién puede entrar al portal".
  - Registro de accesos.
- Búsqueda por apellido, nombre de un adulto, teléfono o nombre de un hijo.

### 7.4 Pacientes

- **Lista:**
  - Solapas por ámbito: Todos · Membresía · Cardales · Hepta · Esporádicos · Sin asignar, con su conteo. En "Todos", cada fila muestra el ámbito.
  - Orden alfabético por apellido.
  - Búsqueda sin distinguir mayúsculas ni tildes, por nombre, apellido, iniciales, DNI o fecha de nacimiento, dentro de la solapa activa.
- **Alta:**
  - Obligatorios: nombre, apellido, fecha de nacimiento y sexo (M, F o X).
  - Opcionales: DNI, ámbito (por defecto "Sin asignar"), cobertura, edad gestacional al nacer (22 a 44 semanas; si queda vacía, se toma como de término), grupo sanguíneo y foto. La foto se carga solo con consentimiento de la familia.
  - Control de duplicados según la regla 8.
- **Edad:**
  - Desde los 12 meses, formato abreviado ("2a 3m 5d"); antes, escrito ("10 meses y 9 días").
  - Siempre se calcula con fechas reales, nunca con meses decimales.
  - Si nació antes de las 37 semanas, se muestra también la edad corregida hasta los 24 meses.
  - Si la fecha de nacimiento es posterior a la de una consulta, la plataforma avisa en lugar de calcular una edad imposible.
- **Ficha:** como en la sección 5.2. El ámbito se cambia desde la ficha y se guarda al instante.

### 7.5 Historia clínica, consultas y nota clínica

**Resumen clínico (antecedentes)**
- Perinatales: edad gestacional, peso al nacer, tipo de parto y complicaciones.
- Patológicos e internaciones.
- Familiares relevantes.
- Hábitos.
- Medicación actual.

**Problemas de salud**
- Descripción, fecha de inicio, estado (activo o resuelto) y fecha de resolución.
- Interruptor "Lo ve la familia", apagado por defecto. Lo prendo después de hablarlo con la familia.

**Alergias**
- Alérgeno, reacción, gravedad y estado (referida o confirmada).
- Las confirmadas se ven destacadas en el encabezado de la ficha y de cada consulta.
- La familia ve siempre las confirmadas y nunca las referidas.

**Consulta**
- Fecha y hora, modalidad, tipo de visita, turno de origen (opcional) y problemas que se abordaron.
- Antropometría: peso (kg), talla (cm) con su posición (acostado o de pie) y perímetro cefálico (cm). El percentilo y el Z se muestran en vivo, con el módulo de la sección 7.6. El IMC se calcula solo.
- Hitos del desarrollo (ver 7.7).
- Todo se guarda solo.

**Nota clínica versionada**
- Texto original de la consulta: lo escribo, lo pego, lo dicto o lo importo de Plaud (ver 7.20).
- Botones "Generar borrador con IA" y "Escribir manualmente".
- Cuatro campos:
  - Hallazgos clínicos.
  - Conducta e indicaciones.
  - Resumen para la familia: es lo que la familia ve, tal cual.
  - Alergias y medicación.
- Casilla "Bandera clínica".
- Estados: borrador → aprobada → reemplazada.
  - "Guardar cambios" deja el borrador para seguir después.
  - "Aprobar y guardar en historia clínica" fija la versión con fecha, hora y autor.
  - "Corregir esta nota" crea una versión nueva y deja la anterior como reemplazada.
  - "Historial de versiones" muestra todas.
- "Volver a generar con IA" reemplaza los cuatro campos; si ya tienen contenido, pide confirmación.
- Reglas para la IA:
  - En urgencias, marca la bandera ante cualquier duda.
  - En controles, no asume normalidad si algo no se dijo.
  - Nunca agrega diagnósticos, dosis ni plazos que no estén en mi texto.

**Seguimientos pendientes**
- Una nota aprobada con bandera entra en la cola de Inicio. Vence a las 24 h si fue urgencia y a las 48 h en el resto.
- Cada seguimiento tiene un mensaje para la familia que puedo editar, con los botones "Copiar mensaje", "Ir a la consulta" y "Marcar resuelto".
- Solo sale de la cola cuando lo marco resuelto.

**Resumen para la familia**
- Al aprobar, el resumen queda disponible en el portal.
- "Preparar el mail" arma un mensaje en lenguaje de familia; lo reviso y toco "Revisé y lo mando". El envío lo hace Make a partir del evento correspondiente (ver sección 8).
- No existe envío sin mi revisión.

**Aceptación:**
- Una nota aprobada no se puede modificar ni por la interfaz ni escribiendo directo en la base: lo impiden las reglas.
- El portal nunca recibe hallazgos ni conducta.

### 7.6 Crecimiento con percentilos reales

**Datos**
- `oms_lms.json`:
  - peso_edad, pc_edad e imc_edad: listas por sexo "M" y "F".
  - talla_edad: separada en "acostado" (0 a 24 meses) y "de_pie" (24 a 228 meses).
  - peso_talla: separada en "acostado" (45 a 110 cm) y "de_pie" (65 a 120 cm), con "t" en centímetros.
  - En el resto, "t" es la edad en meses. El peso/edad de OMS llega hasta los 60 meses.
- `argentina_lms.json`: peso_edad y talla_edad por sexo, de 0 a 228 meses.

**Motor de cálculo**
- Va en un módulo puro, sin interfaz, compartido entre la web, el celular y Cloud Functions, con tests unitarios.
- Z = ((X/M)^L − 1) / (L·S); si L = 0, Z = ln(X/M) / S.
- Interpolación lineal de L, M y S entre los dos puntos de la tabla más cercanos.
- Percentilo = función de distribución normal de Z × 100.
- Curvas: X = M·(1 + L·S·Z)^(1/L), o M·e^(S·Z) si L = 0, con Z = −1,8808 / −1,2816 / −0,6745 / 0 / 0,6745 / 1,2816 / 1,8808 para P3 a P97.
- Fuera del rango de la tabla no se extrapola: se muestra "fuera del rango de la referencia".

**Reglas**
- Referencia por defecto: OMS hasta los 60 meses. Para peso y talla después de los 60 meses, la argentina. PC, IMC y peso/talla, siempre OMS. Un selector permite ver la otra referencia cuando exista.
- Talla: antes de los 24 meses se mide acostado y desde los 24 meses de pie. Si se cargó en la otra posición, se corrige 0,7 cm antes de calcular.
- Prematuros: hasta los 24 meses se usa la edad corregida y esos puntos se dibujan huecos.
- Sexo X: un selector elige la referencia (varón o mujer) y se recuerda por paciente.
- Avisos según criterios OMS:
  - Si |Z| > 3: "valor extremo, revisá la medida".
  - Fuera de los límites de plausibilidad: "probable error de carga". Los límites son peso/edad menor a −6 o mayor a +5; talla/edad menor a −6 o mayor a +6; IMC y peso/talla menor a −5 o mayor a +5.

**Tests obligatorios** (tolerancia ±0,02 en Z)

| Referencia | Indicador | Sexo | Edad | Valor | Z esperado |
| --- | --- | --- | --- | --- | --- |
| OMS | peso/edad | M | 12 m | 10,5 kg | 0,78 (P78) |
| OMS | talla/edad acostado | F | 6 m | 62 cm | −1,65 (P5) |
| OMS | PC/edad | M | 4 m | 43,5 cm | 1,56 (P94) |
| OMS | IMC/edad | F | 60 m | 17,8 | 1,50 (P93) |
| Argentina | talla/edad | M | 96 m | 120 cm | −1,10 (P14) |
| Argentina | peso/edad | F | 84 m | 22,475 kg | 0,00 (P50) |

Sumá también tests de: L = 0, edad fuera de rango, prematuro y corrección de 0,7 cm.

**Pantallas**
- Pestaña Crecimiento:
  - Indicadores: peso, talla, PC, IMC y peso/talla.
  - Rangos de edad: 0–2, 0–5 y 2–19 años.
  - Curvas P3 a P97 con la P50 destacada y los puntos del paciente encima.
  - Tocar un punto muestra fecha, edad, valor, percentilo y Z.
  - Tabla por visita.
- Tarjeta del Resumen: mini gráfico, último valor y su percentilo.
- La familia ve peso, talla y PC con sus bandas, sin Z, avisos ni tabla.

### 7.7 Hitos del desarrollo

- Datos: `hitos_desarrollo.json`.
- Qué lista se muestra:
  - La del control más cercano que no supere la edad corregida (2, 4, 6, 9, 12, 15, 18, 24, 30, 36, 48 y 60 meses).
  - Antes de los 2 meses, la de 2; después de los 66 meses, la de 60. En los dos casos, con un aviso.
  - Un selector permite ver otro control.
- Las listas van organizadas por área (socioemocional, lenguaje, cognitivo y motor). Tildar guarda solo, con el contador "Marcados x de y".
- En los controles que indica el archivo, aparece el recordatorio de tamizaje (AAP o SAP). A los 60 meses se suman las pautas PRUNAPE de 5 años.
- Cuadro fijo: "Si no cumple uno o más hitos, perdió habilidades que tenía o la familia está preocupada, no esperar: tamizaje estandarizado (PRUNAPE, IODI, ASQ-3) o derivación."
- Aclaración visible: "Estas listas orientan; no son un test de tamizaje."

### 7.8 Vacunas

- Fuente: `calendario_vacunas.json`. Es un **borrador**: hasta que yo lo marque como verificado en Configuración, la plataforma muestra el aviso "Calendario sin verificar" y no envía recordatorios a las familias.
- Al crear un paciente, se genera su esquema con la fecha estimada de cada dosis (fecha de nacimiento + edad en meses).
- Cada dosis tiene estado (pendiente, aplicada o atrasada) y, si se aplicó, fecha de aplicación, lugar y lote (opcional).
- También se pueden cargar a mano vacunas no obligatorias (antigripal, otras).
- Tarjeta del Resumen: "Calendario al día" o la cantidad de dosis atrasadas, la última aplicada y la próxima.
- Si cambio el calendario en Configuración, no se reescriben las dosis ya aplicadas.

### 7.9 Medicaciones y prescripciones

- **Medicación actual:** fármaco, presentación, dosis, frecuencia, fecha de inicio y fin, e indicación. La dosis la escribo yo; **la plataforma nunca sugiere ni calcula dosis.**
- **Prescripciones:** registro de lo indicado en cada consulta, más:
  - El botón "Emitir receta en [mi plataforma de recetas]", que abre la plataforma registrada que configure.
  - La opción de adjuntar el PDF de la receta emitida.
- La tarjeta del Resumen muestra las prescripciones activas.

### 7.10 Estudios

- **Pedido:** estudio, motivo, fecha y "Revisar resultado el" (una fecha que estimo yo). La orden legal se emite en la plataforma registrada, igual que las recetas.
- **Estados:** solicitado → realizado → resultado recibido → revisado.
- Se puede adjuntar el resultado, en PDF o imagen.
- Los estudios con resultado sin revisar aparecen en Inicio, y su recordatorio sale por evento a Make.

### 7.11 Certificados y documentos

**Certificados**
- Tipos, con texto prearmado:
  - Aptitud física (para el colegio).
  - Constancia de control de salud (para la prepaga).
  - Buena salud (para el jardín maternal).
  - Constancia de atención.
  - Texto libre.
- Formato:
  - "Certifico que [nombre y apellido], DNI [si está cargado], de [edad], [texto]. Se extiende a pedido de [adulto] para ser presentado ante [destino]."
  - Lugar y fecha.
  - Firma: "Dr. Alan Hughes · Médico Pediatra · MN 111.725 · MP 448.970".
  - El género del texto sale del sexo del paciente; en sexo X, la redacción es neutra.
- Flujo:
  - Elegir el tipo, revisar y editar, previsualizar y emitir.
  - Al emitir se genera un PDF con encabezado de marca y la leyenda "Documento generado digitalmente".
  - Un certificado emitido no se edita: se anula con motivo y se emite otro.
- La firma digital real queda para una etapa posterior.

**Documentos**
- Archivos del paciente en Cloud Storage, con tipo, fecha, origen y si los ve la familia.
- Los enlaces de descarga son temporales y firmados. Nunca enlaces públicos permanentes.

### 7.12 Prevención y educación para la salud

- Biblioteca de materiales que cargo yo (PDF o enlace), etiquetados por edad y tema.
- La plataforma sugiere materiales según la edad del paciente.
- "Enviar material" lo deja disponible en el portal y emite un evento para el aviso.
- La IA puede sugerir qué material corresponde, pero solo entre los que ya cargué. No genera material clínico nuevo para enviar.

### 7.13 Plan de cuidado

- Ítems con categoría (control, prevención, vacuna, estudio, otro), descripción, fecha objetivo y estado (pendiente, hecho o cancelado).
- Se ven agrupados en Hoy / Próximos 30 días / Próximos meses / Prevención, como en la imagen. Los vencidos se resaltan.
- La familia ve los pendientes como "Plan vigente".

### 7.14 Comunicaciones

- Es un **registro**, no un chat. Las conversaciones con las familias van por PacienteX.
- Registra:
  - Lo que sale por las automatizaciones: recordatorios, resúmenes, avisos.
  - Lo que entra por los canales conectados.
  - Lo que yo registre a mano.
- Cada registro tiene canal, dirección (entrante o saliente), clasificación (administrativo, clínico o urgente), fecha, paciente o familia y estado de entrega cuando lo informe Make.
- Ningún mensaje automático contiene información clínica, salvo el resumen aprobado (principio 1).

### 7.15 Registro de fiebre

**Lado familia**
- Toma de temperatura:
  - Fecha y hora.
  - Temperatura en °C (acepta coma).
  - Sitio: axilar, rectal, oral, oído o frente.
  - Estado: "Animado, juega", "Decaído, pero reacciona" o "Muy decaído, irritable o dormido".
  - Si dio un antitérmico en las 6 horas previas, también pregunta "¿Mejoró su ánimo y su aspecto?".
  - Nota opcional.
- Antitérmico:
  - Fecha y hora.
  - Medicamento: paracetamol, ibuprofeno u otro.
  - Dosis, con la aclaración "Anotá la dosis que te indicó tu pediatra. Esta app no sugiere dosis."
- Curva con una línea en 38 °C, los puntos de 38 °C o más en rojo y una marca por cada antitérmico.
- Aviso fijo con los signos de alarma (ver 7.19).

**Lado médico**
- Ve los registros con la cuenta de los que están sin revisar.
- "Marcar revisado".
- Vincular el registro a una consulta; la plataforma sugiere la más cercana en fecha.
- "Agregar resumen al texto de la consulta".
- "+ Registro a mano" para lo que me cuentan por teléfono.

### 7.16 Membresía y pagos

**Membresía**
- Plan (anual o semestral), fecha de alta, próxima renovación, estado (activa, por vencer, vencida, suspendida o cancelada), hijos incluidos y observaciones.
- Precios, monedas y condiciones se configuran en Configuración. No van en el código.
- Valores de hoy, para cargar como configuración inicial:
  - Membresía: USD 2.000 por año por familia, con 50 % de descuento por cada hijo adicional. Si se paga en pesos, se toma el promedio del dólar oficial BNA comprador y vendedor del día.
  - Semestral: USD 1.000.
  - Visitas sueltas, en pesos: control o urgencia en el día $150.000; hermano en la misma visita $100.000; urgencia nocturna, de fin de semana o feriado $190.000.
  - Prenatal: por videollamada $70.000; a domicilio $150.000. Se descuenta de la membresía si la familia se suma dentro de los 30 días del nacimiento.

**Pagos**
- Fecha, monto, moneda, medio (efectivo, transferencia o Mercado Pago), concepto y familia.
- Hoy cargo los pagos mandando "pago …" a mi bot de Telegram. Preparalo para que ese mensaje llegue a un endpoint, vía Make, y cree el pago en estado "a confirmar" (ver sección 8).
- La familia ve el estado de su membresía y sus pagos en modo solo lectura.
- Si la membresía vence, la familia conserva acceso de lectura a toda su documentación.

### 7.17 Reportes

- Reporte mensual con:
  - Visitas del mes por tipo y ámbito.
  - Pacientes nuevos.
  - Vacunas pendientes.
  - Membresías activas y por renovar.
  - Pagos pendientes.
- Exportable a CSV y PDF.
- Solo con datos reales del sistema. Sin proyecciones inventadas.

### 7.18 IA Asistente

- Acciones, como en la imagen:
  - "Resumir historia del paciente".
  - "Preparar evolución de consulta".
  - "Sugerir material educativo".
  - "Revisar estudios pendientes".
  - Un campo para consultas libres sobre el paciente abierto.
- Funcionamiento técnico:
  - Se llama a la API de Claude solo desde Cloud Functions. La clave nunca va al cliente.
  - A la IA se envía solo el mínimo de datos necesario, sin DNI, dirección ni datos de contacto.
  - Cada uso queda registrado en la auditoría: qué acción, de qué paciente, cuándo y si acepté el resultado.
- Reglas:
  - La respuesta siempre es una propuesta que reviso.
  - Nunca agrega diagnósticos, dosis ni plazos que no estén en la historia clínica.
  - Si no tiene datos suficientes, lo dice.
- Configuración:
  - Hay un interruptor general para encender o apagar la IA.
  - Es mejor que arranque apagada, hasta que yo revise el consentimiento informado para el uso de IA con datos de salud.

### 7.19 Portal de las familias

**Inicio**
- "Hola, [nombre]" y el nombre de la familia.
- Banner de membresía: "Membresía activa · se renueva el dd/mm/aaaa", o vencida.
- Selector de hijo cuando hay más de uno.
- **Botón verde "Contactá al Dr. por PacienteX"**, siempre visible. Abre en el navegador del teléfono, fuera de la app, `https://familias.somospacientex.com/familia/inv/PX-NXBMQZTA`. Ese link vive en Configuración. No hay botón de WhatsApp en ningún lado.

**Pedir visita**
- Opciones "Control de salud" y "Consulta por urgencia". Crean una solicitud en la agenda (estado "solicitado"); mientras exista, pueden abrir Cal.com con los links de Configuración.
- Antes de pedir una urgencia, pantalla de signos de alarma con el botón "Entendido, no es una emergencia":

> Consultá de inmediato si tu hijo:
> - Tiene menos de 3 meses y fiebre de 38 °C o más.
> - Está muy decaído, dormido o cuesta despertarlo, incluso estando sin fiebre.
> - Respira con dificultad o muy rápido.
> - Tiene convulsiones, rigidez de cuello o manchas violáceas que no desaparecen al estirar la piel.
> - Vomita todo lo que toma o hace muchas horas que no orina.
>
> En una emergencia, llamá al SAME 107.

**Por cada hijo**
- Informes de las visitas: resúmenes de notas aprobadas.
- Plan vigente.
- Alergias y temas de salud: alergias confirmadas y los problemas visibles, con la etiqueta "En seguimiento" o "Resuelto".
- Crecimiento.
- Vacunas.
- Registro de fiebre.
- Certificados y documentos habilitados.
- Materiales educativos enviados.

**Mis datos:** la familia puede actualizar su teléfono, email y direcciones. Cada cambio queda auditado y me avisa.

**Aceptación:** entrando como cada adulto de demostración, ningún dato oculto aparece en ninguna pantalla ni en ninguna respuesta de la base. Probalo con tests de Security Rules en el emulador.

### 7.20 Plaud (grabaciones de consulta)

- Hoy, Plaud manda la transcripción a Make vía Zapier. Prepará un endpoint que reciba la transcripción de Make.
- Al recibirla, la plataforma:
  - Crea un borrador de nota en la consulta correspondiente, o una consulta nueva.
  - Sugiere el paciente por la fecha de nacimiento dictada; si coinciden varios, elijo yo.
  - Si dicté medidas, propone peso, talla y PC con los botones "Usar estos valores" y "Descartar".
- Nada se aprueba solo.

### 7.21 Configuración

- Datos del profesional: nombre, matrículas MN 111.725 y MP 448.970, firma y encabezado.
- Agenda: horarios por día, bloqueos, duración por tipo de visita, buffer de traslado y zonas de cobertura.
- Ámbitos de atención.
- Membresía, precios y monedas.
- Links: Cal.com (control de salud y urgencia), PacienteX y plataforma de recetas.
- Calendario de vacunas, con el estado "verificado".
- Plantillas de certificados.
- Biblioteca educativa.
- Automatizaciones: URL del webhook de Make, secreto de firma (guardado como secreto en Functions, nunca en el cliente) y qué eventos se emiten.
- IA: encendida o apagada.

---

## 8. Automatizaciones (Make)

Tengo un sistema de automatizaciones en Make que hoy lee y escribe en Notion y manda mensajes por WhatsApp (Twilio), email (Gmail) y Telegram.

**Objetivo:** Pediatric OS pasa a ser la fuente de verdad y Make sigue haciendo los envíos. **Vos no tenés acceso a Make ni a Notion y no los tocás.** Tu trabajo es dejar Pediatric OS listo para conectarse, y documentar para cada automatización qué tengo que cambiar yo en Make.

### 8.1 Cómo se conecta

1. **Eventos salientes.**
   - Cada cambio relevante escribe un evento en una colección "outbox". Una Cloud Function lo envía a un único webhook de Make (ya existe un escenario "Pediatric OS — eventos"), con firma HMAC, reintentos con espera creciente y registro del resultado.
   - Cada evento lleva tipo, fecha, identificadores y el **mínimo** de datos necesario para ese envío.
   - Eventos:
     - `turno.solicitado`, `turno.confirmado`, `turno.reprogramado`, `turno.cancelado` y `turno.en_camino`.
     - `turno.recordatorio_24h`, emitido por una función programada.
     - `paciente.creado`, `familia.creada` y `familia.datos_actualizados`.
     - `nota.aprobada`, sin contenido clínico; el resumen solo viaja en el siguiente.
     - `resumen.envio_aprobado`, el único evento con texto clínico: el resumen para la familia que yo aprobé.
     - `seguimiento.creado` y `seguimiento.vencido`.
     - `vacuna.proxima` y `vacuna.atrasada`, solo con el calendario verificado.
     - `estudio.revisar_resultado`.
     - `membresia.alta`, `membresia.por_renovar` y `pago.vencido`.
     - `control.proximo`, generado desde el plan de cuidado.
     - `certificado.emitido`: el PDF viaja como adjunto de mail, nunca por WhatsApp.
     - `material.enviado` y `fiebre.registro_nuevo`.
2. **Endpoints entrantes**, cada uno con validación de firma o secreto:
   - `cal.reserva` y `cal.cancelacion`.
   - `formulario.web`.
   - `tally.admision`, `tally.triage_urgencia` y `tally.feedback`.
   - `plaud.transcripcion`.
   - `telegram.pago`.
   - `mensajeria.estado`: el estado de entrega de lo que mandó Make.
   - `mensajeria.entrante`: lo que entra por el número de avisos.
3. **Transición.** Durante la migración, Make puede seguir escribiendo en Notion a partir de los eventos, para que las automatizaciones que leen de Notion sigan funcionando. Pediatric OS nunca escribe directo en Notion.
4. **Reglas de mensajería que tenés que respetar en los eventos:**
   - Un WhatsApp que inicia mi negocio solo puede salir con una plantilla aprobada por Meta. El evento indica qué plantilla corresponde.
   - Mis avisos internos van por Telegram.
   - Los teléfonos viajan en formato E.164.

### 8.2 Inventario de lo que tengo hoy en Make

Para cada fila, implementá el evento o endpoint indicado y documentá en `docs/AUTOMATIZACIONES.md`:
- El payload exacto.
- Qué tengo que cambiar en el escenario.
- Cómo lo pruebo.

| Escenario de Make (ID) | Qué hace hoy | En Pediatric OS |
| --- | --- | --- |
| Cal.com → Notion — Nueva visita (4734293) | Reserva de Cal.com → visita en Notion, aviso por Telegram, WhatsApp `confirmacion_turno` y email | Endpoint `cal.reserva` → turno "solicitado"; evento `turno.confirmado` para la confirmación a la familia |
| Integration Webhooks (4405193) | Formulario web → familia en Notion, aviso, WhatsApp `confirmacion_consulta_web` | Endpoint `formulario.web` → solicitud y familia "por identificar" |
| Membresía — Bienvenida (6221828) | Familia nueva → WhatsApp `bienvenida_membresia` y email | Evento `membresia.alta` |
| Membresía — Aviso de renovación (6221911) | Diario: aviso a ≤ 30 días, repite cada 20 | Evento `membresia.por_renovar` (la lógica de plazos vive en Pediatric OS) |
| Membresía — Reporte mensual (6266921) | Métricas del mes por Telegram | Reemplazado por el módulo Reportes; opcional, evento mensual con el resumen |
| Membresía — Seguimiento de pagos vencidos (6266953) | Aviso a mí por Telegram a los 15 días de vencido | Evento `pago.vencido` |
| Número de avisos — respuesta y aviso a Telegram (6269526) | Bot de preguntas frecuentes en el número de avisos | Se mantiene en Make; opcional, endpoint `mensajeria.entrante` para registrar en Comunicaciones |
| OSDE — Turno reservado (6591381) | Aviso por Telegram de turnos de Consultorio Digital OSDE | Se mantiene en Make; opcional, endpoint para crear el turno |
| Pediatric OS — eventos (6602936) | Receptor de eventos del prototipo anterior | Receptor del webhook único de eventos |
| Plaud → Notion — Resumen de visita (5859789) | Transcripción → nota en Notion | Endpoint `plaud.transcripcion` → borrador en Pediatric OS |
| Plaud → Envío aprobado — Email y WhatsApp (5860040) | Envía el resumen aprobado (plantilla `resumen_visita` y email) | Evento `resumen.envio_aprobado` |
| Puente Telegram → WhatsApp (6276487) | Mis respuestas en Telegram salen como WhatsApp a la familia | Se mantiene en Make; los eventos que me avisan incluyen el teléfono para que el puente funcione |
| Recordatorio 24hs antes — Email (4741361) | Recordatorio del turno | Evento `turno.recordatorio_24h` |
| Recordatorio Control y Seguimiento (4805685) | Recordatorios de controles | Evento `control.proximo` |
| Tally — Triage de urgencia (6281894) | Me avisa el cuadro antes de salir | Endpoint `tally.triage_urgencia` → se adjunta a la solicitud de urgencia, visible solo para mí |
| Tally — Feedback del servicio (6281896) | Me avisa cada respuesta | Se mantiene en Make |
| Visitas — Documentos automáticos (6268024) | Genera constancia o certificado desde Google Docs y lo manda por mail | Reemplazado por el módulo Certificados; evento `certificado.emitido` |
| Visitas — Recordatorio de estudios pendientes (6269428) | Me avisa por Telegram | Evento `estudio.revisar_resultado` |
| Backup semanal — Notion (6268809) | Copia de Notion a Google Sheets | Reemplazado por la copia de seguridad de Firestore (sección 9) |
| Vacunas — Alta automática (5836968) e Aviso diario (5837079), hoy apagados | Esquema y recordatorio de vacunas | Módulo Vacunas y eventos `vacuna.proxima` y `vacuna.atrasada` |
| Estoy en camino — WhatsApp (4824303), hoy apagado | Aviso a la familia | Evento `turno.en_camino` |
| Bot de pagos en Telegram (registro de "pago …") | Carga pagos en Notion | Endpoint `telegram.pago` |

---

## 9. Modelo de datos

Proponé el modelo de Firestore (colecciones, subcolecciones e índices) a partir de estas entidades.

**Reglas generales del modelo**
- `organizationId` en toda entidad de primer nivel, para un futuro multi-consultorio.
- Los datos clínicos en colecciones separadas de los administrativos, para que el rol de asistente no pueda leerlos.
- Archivado (`archivedAt`) en lugar de borrado en todo lo clínico.

**Entidades**
- **Seguridad y organización:** Organization, User (rol: medico, familia o asistente), Professional y Consent (consentimientos: portal, foto, grabación, uso de IA).
- **Administrativas:**
  - Family y Guardian.
  - PatientRelationship: paciente y adulto, tipo, principal y vigencia desde/hasta.
  - Address: cuelga del adulto.
  - Patient: datos de la sección 7.4 y ámbito.
  - Membership y Payment.
- **Agenda:**
  - Appointment: con historial de estados.
  - AvailabilityRule, Block y Zone.
- **Clínicas:**
  - ClinicalBackground.
  - ClinicalProblem: con "lo ve la familia".
  - Allergy.
  - Consultation y ConsultationProblem.
  - ClinicalNote: número de versión, versión anterior, estado, los cuatro campos, bandera, origen (humano o IA) y quién la aprobó y cuándo.
  - FollowUp.
  - GrowthMeasurement: con posición.
  - MilestoneCheck.
  - VaccineDose.
  - Medication y PrescriptionRecord.
  - StudyOrder y StudyResult.
  - CarePlanItem.
  - FeverEntry: toma o antitérmico, datos, quién la cargó, si está revisada y consulta vinculada.
- **Documentos:** Certificate, Document, EducationalMaterial y MaterialDelivery.
- **Comunicación y automatización:** Communication, Notification, OutboxEvent e InboundEvent.
- **Trazabilidad:** AuditLog, que solo suma filas, y AiInteraction.

Para cada colección: quién lee, quién escribe y qué valida la regla. Acompañalo con tests de reglas en el emulador.

**Copia de seguridad y conservación**
- Exportación programada de Firestore y Storage a un bucket separado, con retención documentada.
- Proponé la región de Firebase y marcala para mi revisión legal: hay transferencia internacional de datos de salud.
- Las políticas de conservación, eliminación e incidentes se documentan como pendientes de mi validación legal. No afirmes plazos legales.

---

## 10. Plan de trabajo

Trabajás por etapas. **Al final de cada etapa te detenés y esperás mi OK.** No sigas de largo.

En cada etapa:
1. Corré el chequeo de tipos, el linter, los tests y los tests de reglas en el emulador.
2. Verificá que la app arranque en web y en el celular (Expo).
3. Hacé un commit por módulo, con mensaje en español.
4. Contame en pocas líneas qué cambió, cómo lo pruebo y qué decidiste sin preguntarme.
5. Actualizá `CLAUDE.md` con el estado del proyecto, las decisiones y estas reglas.

| Etapa | Contenido |
| --- | --- |
| 0. Exploración y propuesta | Inventario del repositorio (qué existe, qué sirve y qué no); stack; propuesta de arquitectura, modelo de datos, reglas de seguridad, prevención de doble reserva y variables de configuración; tokens de diseño sacados de la imagen y un mapa de pantallas web/celular. **Sin código hasta mi OK.** |
| 1. Base | Sistema de diseño, navegación web y celular, autenticación y roles, reglas, auditoría, outbox y datos de demostración |
| 2. Pacientes y familias | Lista con ámbitos, alta sin duplicados, familias y adultos, ficha con encabezado y pestaña Resumen (con tarjetas vacías donde falten módulos) |
| 3. Agenda y turnos | Vistas, estados, acciones, validación en servidor y endpoint de Cal.com |
| 4. Clínica | Antecedentes, problemas, alergias, consulta, nota versionada, seguimientos, crecimiento e hitos |
| 5. Seguimiento | Vacunas, medicación y prescripciones, estudios, plan de cuidado, certificados, documentos y prevención |
| 6. Portal | Portal de familias, registro de fiebre y botón de PacienteX |
| 7. Gestión | Membresía, pagos, comunicaciones, reportes y Configuración |
| 8. Automatizaciones | Eventos salientes, endpoints entrantes, Plaud y `docs/AUTOMATIZACIONES.md` |
| 9. IA Asistente | Funciones del servidor, pantallas y registro |
| 10. Verificación y entrega | Ver secciones 11 y 12 |

Si en algún momento el pedido es demasiado grande para una etapa, partila y avisame.

---

## 11. Pruebas y aceptación

Además de los criterios de cada módulo, comprobá al menos estos escenarios. **No declares superada una prueba que no ejecutaste.**

1. Crear una familia con dos adultos que viven en domicilios distintos.
2. Registrar dos hijos en la misma familia y verificar que no se pueda duplicar a uno.
3. Crear un turno, confirmarlo e intentar otro superpuesto: el servidor lo rechaza.
4. Reprogramar y cancelar un turno, y ver el historial.
5. Recibir una reserva simulada de Cal.com y verla como "solicitado".
6. Hacer una consulta completa: medidas con percentilos, hitos, nota con IA desactivada (borrador manual), aprobar y corregir.
7. Intentar modificar una nota aprobada escribiendo directo en la base: lo impiden las reglas.
8. Aprobar una nota con bandera y verla en Seguimientos pendientes con el vencimiento correcto.
9. Correr los tests de percentilos de la sección 7.6.
10. Generar el esquema de vacunas de un recién nacido con el calendario sin verificar: aparece el aviso y no se emiten recordatorios.
11. Emitir un certificado, anularlo y emitir otro.
12. Entrar al portal como cada adulto: ve solo lo habilitado. Un problema oculto y una alergia referida no aparecen ni en la interfaz ni leyendo la base.
13. Cargar fiebre desde el portal y verla como "sin revisar" del lado médico.
14. Que el botón de PacienteX abra el link configurado fuera de la app.
15. Que un usuario sin rol o con rol asistente no pueda leer datos clínicos.
16. Generar un evento y verlo salir con la firma correcta hacia un webhook de prueba, con reintento ante error.
17. Recorrer la plataforma en una computadora y en un celular, incluyendo errores de validación y estados vacíos.

---

## 12. Entrega final

- Aplicación funcional en web y en el celular, con datos de demostración.
- Código organizado por módulos, con la interfaz, la lógica de negocio y el acceso a datos separados.
- `docs/MODELO_DE_DATOS.md`, `firestore.rules` y `storage.rules`, con sus tests.
- `docs/AUTOMATIZACIONES.md`: cada evento y endpoint, con su payload y lo que tengo que hacer en Make.
- `.env.example` con las variables necesarias, sin secretos reales.
- Instrucciones de configuración de Firebase, ejecución local con emuladores, compilación del celular (EAS) y despliegue de la web.
- Resultados de las pruebas ejecutadas.
- Lista de funciones completas, pendientes y futuras, y de todo lo que requiere una acción o revisión mía (legal, Make, calendario de vacunas, consentimientos).

## 13. Fuera de alcance por ahora

- Emisión de recetas y órdenes legales: van en la plataforma registrada.
- Firma digital real.
- Integración técnica con PacienteX más allá del botón.
- Facturación a prepagas u obras sociales.
- Migración de los datos reales que hoy están en Notion y DrApp.
- Chat con las familias.

Empezá por la Etapa 0. No escribas código hasta que te diga que sí.
