# Dr. Alan Hughes · Pediatría a domicilio

App móvil (iOS y Android, con Expo) que reúne la historia clínica y el portal de las familias.

**Versión de Expo:** SDK 57, a propósito: es la versión que corre el Expo Go del iPhone del Dr. Hughes. Antes de actualizar, revisá qué SDK pide Expo Go (aparece en el error de incompatibilidad).

**Etapa 1:** datos de ejemplo ficticios en memoria, sin backend. Al abrir la app se elige el rol (modo prueba).

## Cómo probarla

```bash
npm install
npx expo start
```

- En el celular: instalá **Expo Go** y escaneá el código QR.
- En la compu: apretá `w` para abrirla en el navegador.

## Dónde está cada cosa

| Qué | Dónde |
| --- | --- |
| Links de PacienteX y Cal.com | `src/config.ts` |
| Colores, tipografías y tamaños | `src/theme.ts` |
| Modelo de datos (tablas para Vibecode Cloud) | `src/data/types.ts` |
| Reglas de qué ve la familia | `src/data/selectores.ts` |
| Datos de ejemplo (ficticios) | `src/data/mock.ts` |
| Tablas OMS, SAP/Lejarraga e hitos | `src/data/referencias/` |
| Cálculo de percentilos (LMS) | `src/lib/percentiles.ts` |
| Hitos del desarrollo | `src/lib/hitos.ts` |
| Borrador de nota "con IA" (de ejemplo, sin IA real) | `src/lib/notaIA.ts` |
| Pantallas | `src/app/` (`familia/` y `medico/`) |

## Etapa del backend (Vibecode Cloud)

- Cada interfaz de `types.ts` es una tabla. Nada clínico se borra: se archiva (`archivedAt`).
- Las notas aprobadas son inmutables: corregir crea una versión nueva y la anterior queda "Reemplazada".
- AuditLog solo suma filas (incluye el registro de accesos).
- Las reglas de `selectores.ts` (resumen de notas aprobadas, alergias confirmadas, problemas visibles) tienen que replicarse como reglas de acceso en el servidor.
- `store.tsx` es el único lugar que hay que reemplazar para conectar la base de datos y el enlace mágico por email.
- Para conectar la IA real, reemplazar `borradorDeEjemplo` en `notaIA.ts` respetando sus reglas.
