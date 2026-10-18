# Dr. Alan Hughes · Pediatría a domicilio

Pediatric OS: la historia clínica de la práctica del Dr. Hughes y el portal de las familias. Web y celular (Expo), con backend en Firebase.

**Versión de Expo:** SDK 57, a propósito: es la versión que corre el Expo Go del iPhone del Dr. Hughes. No se actualiza sin preguntarle.

## Cómo probarla

```bash
npm install
npx expo start
```

- En el celular: abrí **Expo Go** y escaneá el código QR.
- En la compu: apretá `w` para abrirla en el navegador.

Así arranca con datos de ejemplo ficticios en memoria y un selector de rol. Para usarla con Firebase (emuladores en esta computadora o el proyecto real), seguí `docs/INSTALACION.md`.

## Documentación

| Qué | Dónde |
| --- | --- |
| Instalación, Firebase, web y app (EAS) | `docs/INSTALACION.md` |
| Estado, pendientes y lo que necesita una acción del Dr. | `docs/ENTREGA.md` |
| Resultados de las pruebas | `VERIFICACION.md` |
| Modelo de datos y permisos | `docs/MODELO_DE_DATOS.md` |
| Eventos y endpoints para Make | `docs/AUTOMATIZACIONES.md` |
| Pedido completo (manda sobre todo lo demás) | `docs/PROMPT_MAESTRO.md` |
| Guía para trabajar en el código | `CLAUDE.md` |

## Dónde está cada cosa

| Qué | Dónde |
| --- | --- |
| Pantallas | `src/app/` (`medico/` y `familia/`) |
| Componentes | `src/components/` |
| Acceso a datos (demostración y Firebase, mismo contrato) | `src/data/` |
| Lógica pura con tests (percentilos, fechas, certificados…) | `src/lib/` |
| Lógica compartida con el servidor | `shared/` |
| Cloud Functions | `functions/src/` |
| Colores, tipografías y tamaños | `src/theme.ts` |
| Tablas OMS, SAP/Lejarraga e hitos | `src/data/referencias/` |
