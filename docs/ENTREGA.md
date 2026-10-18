# Entrega · Pediatric OS (Etapa 10)

Estado al 18/10/2026. Qué está hecho, qué falta, qué queda para más adelante y qué necesita una acción o una revisión tuya.

| Documento | Para qué |
| --- | --- |
| `docs/INSTALACION.md` | Correrla en la compu, crear el proyecto real de Firebase, desplegar la web y compilar la app (EAS) |
| `VERIFICACION.md` | Resultados de las pruebas (las 17 de la sección 11, al final del archivo) |
| `docs/MODELO_DE_DATOS.md` | Colecciones, permisos y qué ve cada uno |
| `docs/AUTOMATIZACIONES.md` | Cada evento y endpoint, con su payload y qué hacer en Make |
| `firestore.rules`, `storage.rules` | Reglas de seguridad, con sus tests (`npm run test:reglas`) |
| `.env.example`, `functions/.secret.local.example` | Variables y secretos, sin valores reales |

---

## Funciones completas

Funcionan en la web y en el celular (Expo Go), sobre los emuladores y con los datos de demostración.

- **Inicio:** visitas del día, seguimientos con bandera y su vencimiento, fiebre sin revisar, avisos.
- **Agenda:** día, semana y mes; estados y acciones del turno con historial; superposición y buffer controlados en el servidor; bloqueos (en Configuración); reservas de Cal.com.
- **Familias y pacientes:** ámbitos, alta con control de duplicados, adultos con domicilios propios, vínculos por hijo (al cargar un hijo desde la familia, se vincula con sus adultos).
- **Clínica:** antecedentes, problemas, alergias, consulta con antropometría y percentilos (OMS y SAP/Lejarraga), hitos, nota clínica versionada (aprobar, corregir), seguimientos, resumen para la familia.
- **Seguimiento:** vacunas (esquema desde el calendario en borrador), medicación y prescripciones (la dosis la escribe el médico), estudios, plan de cuidado, archivos, certificados en PDF (emitir y anular), biblioteca de prevención.
- **Portal de las familias:** enlace mágico, cada adulto ve solo a sus hijos y solo lo habilitado, fiebre, pedir visita, Mis datos, membresía y pagos confirmados, certificados, botón "Escribime por PacienteX".
- **Gestión:** Configuración, membresías y pagos, comunicaciones (registro), reportes (CSV y PDF), nombres de los ámbitos, plantillas de certificados.
- **Automatizaciones:** eventos firmados hacia Make con reintentos, avisos programados, entrada desde Make (formulario web, Tally, Plaud, pago por Telegram, mensajería), endpoint de Cal.com.
- **IA Asistente:** cinco acciones en el servidor, datos mínimos sin identificar, registro de cada uso; apagada hasta que la enciendas.
- **Calidad:** auditoría de cada cambio; nada clínico se borra; 373 tests de la app, 72 de las Functions, 83 de reglas y 55 de integración.

## Pendientes (dentro del alcance)

- **Asistente:** el rol existe y las reglas lo contemplan, pero todavía no tiene pantallas (al entrar, la app le dice que llega más adelante).
- **Foto del paciente:** todavía no se puede cargar.
- **Sumar un adulto desde la pantalla de la familia:** hoy se suma desde cada hijo.
- **Precio semestral:** sin descuento por hijo adicional, porque no lo definiste.
- **Plantillas de mensajes:** solo tienen plantilla los cuatro eventos que nombraste; los demás salen sin plantilla hasta que la definas (`docs/AUTOMATIZACIONES.md`).

## Para más adelante (fuera de alcance, sección 13)

Recetas y órdenes legales (van en la plataforma registrada; la app abre el link que configures), firma digital, integración con PacienteX más allá del botón, facturación a prepagas y obras sociales, migración de los datos reales de Notion y DrApp, chat con las familias.

---

## Lo que necesita una acción tuya

**Para poner la app en marcha**

1. Crear el proyecto real de Firebase en plan Blaze y seguir `docs/INSTALACION.md` (o pasárselo a quien te ayude).
2. Crear tu usuario y correr el script del primer médico.
3. Activar el segundo factor (Identity Platform, el script de TOTP y Configuración › Seguridad). No se pudo probar en los emuladores: la primera prueba real es esa.
4. Credenciales del mail del enlace mágico: `SMTP_USUARIO` y `SMTP_CLAVE` (contraseña de aplicación de Gmail o Workspace). Sin ellas, las familias no pueden entrar.
5. Dominio de la web (o usar el de Firebase) y, para la app propia, el identificador de la app y la cuenta de Apple Developer.

**Configuración (desde la app)**

6. Links: PacienteX, Cal.com y la plataforma de recetas.
7. Precios, horarios, zonas, duraciones y buffer (los valores de la agenda son provisorios).
8. Datos profesionales y firma para los certificados.

**Revisión clínica**

9. **Calendario de vacunas:** está en borrador (`assets/data/calendario_vacunas.json`). Mientras no lo marques como verificado, la familia no ve fechas estimadas y no salen recordatorios.
10. Plantillas de certificados y textos de la biblioteca de prevención.

**Make (`docs/AUTOMATIZACIONES.md`)**

11. Crear o adaptar los escenarios, cargar `MAKE_WEBHOOK_URL` y `MAKE_WEBHOOK_SECRET`, y definir las plantillas que faltan.
12. Cal.com: apuntar el webhook a `reservaCalcom` con `CALCOM_WEBHOOK_SECRET`.

**Revisión legal (con tu abogado; nada de esto es una afirmación legal)**

13. **Región de los datos:** `southamerica-east1` (San Pablo) implica transferencia internacional de datos de salud.
14. **Consentimientos:** el texto para el uso de la IA con datos de salud (la IA no se enciende sin que marques que lo revisaste) y el de la foto del paciente.
15. **IA:** cargar `ANTHROPIC_API_KEY` solo después de esa revisión.
16. **Conservación y copias:** la propuesta de abajo.

---

## Propuesta de conservación y copias (para revisar)

Es una propuesta técnica, no un dictamen. Los plazos los define tu abogado; la ley de derechos del paciente (26.529) habla de un plazo mínimo de conservación de la historia clínica, que conviene que él confirme.

- **Conservación:** nada clínico se borra (se archiva) y la auditoría solo suma filas, así que el sistema ya conserva todo sin plazo. Lo que haya que eliminar por pedido de una familia o por vencimiento del plazo legal se haría con un procedimiento aparte, documentado y auditado, que hoy no existe.
- **Copias de Firestore:** activar la recuperación a un punto en el tiempo (permite volver a cualquier momento de los últimos 7 días) y una copia programada semanal con la mayor retención disponible. Se configura en Google Cloud › Firestore › Recuperación ante desastres.
- **Copias de Storage (PDF y archivos):** activar el versionado de objetos del bucket, para que un archivo pisado o borrado se pueda recuperar.
- **Exportación anual:** una exportación completa a un bucket aparte, con acceso solo tuyo.
- **Incidentes:** ante un acceso indebido o una pérdida de datos, revisar la auditoría (`auditLog`), deshabilitar los accesos afectados desde la app, restaurar desde la copia y dejar registro de lo hecho y de a quién se avisó. A quién hay que avisar y en qué plazo lo define tu abogado.
