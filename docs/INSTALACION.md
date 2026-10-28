# Instalación y despliegue · Pediatric OS

Para el Dr. Hughes o para quien lo ayude con la parte técnica. Todo se hace desde la carpeta del proyecto (la ruta tiene espacios: escribila entre comillas en la terminal).

Usá siempre la CLI de Firebase **del proyecto** (`npx firebase …`), no otra instalada en la Mac.

---

## 1. En esta computadora, con datos de demostración

Requisitos: Node 22 y Java 21 (Temurin), ya instalados.

```bash
npm install
npm --prefix functions install
```

**Sin backend** (datos ficticios en memoria, con selector de rol):

```bash
npx expo start
```

En la compu, apretá `w`. En el iPhone, abrí Expo Go y escaneá el QR (si la red no deja, `npx expo start --tunnel --clear`).

**Con Firebase, en los emuladores** (tres terminales):

```bash
npm run emuladores
```

```bash
npm run sembrar
```

```bash
npm run web:firebase
```

- La web queda en http://localhost:8083 y la interfaz de los emuladores, en http://127.0.0.1:4000.
- El usuario de prueba del médico y su clave están en `scripts/sembrar.ts` (solo valen en el emulador).
- Para el iPhone con los emuladores: misma red Wi-Fi y `EXPO_PUBLIC_EMULADOR_HOST` con la IP de la Mac en `.env.local` (el túnel de Expo no llega a los emuladores).

**Pruebas:**

| Qué | Comando |
| --- | --- |
| Tipos (app, tests, scripts y Functions) | `npm run typecheck` |
| Linter | `npx eslint src` |
| Lógica de la app | `npm test` |
| Lógica de las Functions | `npm run test:funciones` |
| Reglas de Firestore y Storage | `npm run test:reglas` |
| Triggers y Functions en el emulador | `npm run test:integracion` |

Las dos últimas levantan sus propios emuladores: cerrá antes los de `npm run emuladores`.

---

## 2. Crear el proyecto real de Firebase

Se hace una sola vez. Lo que sigue usa `pediatric-os` como id: si Firebase da otro (los ids son únicos en el mundo), usá ese en todos los pasos.

1. **Proyecto.** En https://console.firebase.google.com, "Agregar proyecto". Pasalo al **plan Blaze** (pago por uso): las Cloud Functions y Secret Manager lo exigen. Conviene poner una alerta de presupuesto en Google Cloud.
2. **Firestore.** Crear la base en modo producción, ubicación **southamerica-east1**. La ubicación no se puede cambiar después (y está sujeta a tu revisión legal: ver `docs/ENTREGA.md`).
3. **Storage.** Crear el bucket por defecto, en la misma ubicación.
4. **Authentication.** Activar el proveedor "Correo electrónico/contraseña". En "Dominios autorizados", agregar el dominio de la web (paso 5).
5. **App web.** En Configuración del proyecto › Tus apps, registrar una app web. Los cinco valores que muestra (`apiKey`, `authDomain`, `projectId`, `storageBucket`, `appId`) van en `EXPO_PUBLIC_FIREBASE_*`. No son secretos.
6. **Permiso para firmar.** En Google Cloud › IAM, darle a la cuenta de servicio de las Functions (la "Compute Engine default service account") el rol **Service Account Token Creator**. Sin eso no anda el ingreso de las familias con el enlace mágico ni los enlaces firmados de los certificados.
7. **Vincular la carpeta con el proyecto:**

```bash
npx firebase login
```

```bash
npx firebase use --add pediatric-os
```

### Parámetros y secretos de las Functions

Crear `functions/.env.pediatric-os` (no se sube al repositorio):

```
ORGANIZACION_ID=org-hughes
URL_APP=https://pediatric-os.web.app
MAKE_WEBHOOK_URL=
```

- `ORGANIZACION_ID`: el mismo que uses en el paso del primer médico. Es un id interno, en minúsculas.
- `URL_APP`: la dirección de la web (paso 4 de "Desplegar"). Con ella se arma el enlace mágico.
- `MAKE_WEBHOOK_URL`: vacía hasta que el escenario de Make esté listo (`docs/AUTOMATIZACIONES.md`). Mientras tanto, los eventos quedan "sin destino".

Cargar los secretos, uno por uno (la CLI pide el valor sin mostrarlo):

```bash
npx firebase functions:secrets:set MAKE_WEBHOOK_SECRET
```

Lo mismo para `CALCOM_WEBHOOK_SECRET`, `SMTP_USUARIO`, `SMTP_CLAVE` y `ANTHROPIC_API_KEY`. Si todavía no tenés alguno, cargá un valor vacío y después lo cambiás: la app dice en palabras qué falta (mail que no sale, IA sin clave, eventos sin destino).

### Desplegar reglas, índices y Functions

```bash
npx firebase deploy --only firestore,storage,functions
```

Al terminar, la CLI muestra la dirección de cada función HTTP. Dos se usan afuera:

- `reservaCalcom`: va en el webhook de Cal.com (con el mismo secreto que `CALCOM_WEBHOOK_SECRET`).
- `entradaMake`: va en los escenarios de Make que mandan datos a la app (`docs/AUTOMATIZACIONES.md`).

### Primer médico

1. En Authentication › Usuarios, "Agregar usuario" con tu email y una contraseña fuerte.
2. En esta computadora, con permisos de administrador del proyecto:

```bash
gcloud auth application-default login
```

```bash
npm run primer-medico -- --proyecto pediatric-os --email TU_EMAIL --organizacion org-hughes
```

El script no crea usuarios ni contraseñas: solo le da el rol de médico al usuario que ya existe, crea la organización y lo deja en la auditoría. Desde ahí, los demás roles (asistente) se asignan desde la app. Se puede probar antes contra los emuladores con `--emulador`.

La base real arranca vacía: **no se cargan los datos de demostración** (`npm run sembrar` solo funciona en el emulador).

### Segundo factor del médico (recomendado)

Además de la contraseña, la app pide el código de 6 números de una app de autenticación (Google Authenticator, 1Password, la de Apple…). Es TOTP: no tiene costo por uso, a diferencia de los SMS. Los emuladores no lo admiten, así que se prueba directamente en el proyecto real.

1. En la consola, Authentication › Configuración: pasar a **Firebase Authentication con Identity Platform** (lo pide Firebase para el segundo factor). Con email y contraseña, el nivel gratuito alcanza de sobra para el consultorio.
2. Activar TOTP en el proyecto (una vez):

```bash
npx tsx scripts/activar-segundo-factor.ts --proyecto pediatric-os
```

3. Entrar a la app como médico: Configuración › Seguridad › "Activar el segundo factor". En la web aparece un QR para escanear con el teléfono; en el teléfono, un botón que abre la app de autenticación (o la clave para escribirla a mano). Se confirma con el primer código.
4. Desde ahí, cada ingreso pide el código. El script del primer médico ya deja el email como verificado, que Firebase exige.

Si se pierde el teléfono, quien administra el proyecto quita el segundo factor y el médico lo vuelve a activar:

```bash
npx tsx scripts/quitar-segundo-factor.ts --proyecto pediatric-os --email TU_EMAIL
```

---

## 3. Desplegar la web

1. Crear `.env.production.local` (no se sube) con:

```
EXPO_PUBLIC_DATOS=firebase
EXPO_PUBLIC_USE_EMULATORS=false
EXPO_PUBLIC_FIREBASE_API_KEY=…
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=…
EXPO_PUBLIC_FIREBASE_PROJECT_ID=pediatric-os
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=…
EXPO_PUBLIC_FIREBASE_APP_ID=…
```

2. Armar la web (queda en `dist/`):

```bash
npm run web:exportar
```

3. Subirla a Firebase Hosting:

```bash
npx firebase deploy --only hosting
```

4. Queda en `https://pediatric-os.web.app`. Si querés un dominio propio, se agrega en Hosting › Agregar dominio personalizado; en ese caso, cambiá `URL_APP` y agregalo a los dominios autorizados de Authentication.

---

## 4. App para el celular (EAS)

Hasta ahora la app se prueba con Expo Go. Para tenerla instalada como app propia hace falta compilarla con EAS, el servicio de Expo.

Antes, definí con el Dr.:

- **Identificador de la app** (`ios.bundleIdentifier` y `android.package` en `app.json`), por ejemplo con el dominio de su web al revés. No se puede cambiar después de publicarla.
- **Cuenta de Apple Developer** (para iPhone) y, si hace falta, de Google Play.

Pasos:

```bash
npx eas-cli login
```

```bash
npx eas-cli init
```

Cargar las variables públicas de Firebase en EAS (las mismas del paso de la web) desde https://expo.dev › el proyecto › Environment variables, o con `npx eas-cli env:create`. `eas.json` ya fija `EXPO_PUBLIC_DATOS=firebase` y `EXPO_PUBLIC_USE_EMULATORS=false`.

Una versión de prueba, para instalar en tu iPhone:

```bash
npx eas-cli build --profile preview --platform ios
```

La versión para las tiendas usa `--profile production` y después `npx eas-cli submit`.

**SDK de Expo:** la app está en el SDK 58, el de tu Expo Go (28/10/2026). Expo Go solo se puede instalar en su última versión: cuando se actualice a un SDK nuevo, la app tiene que acompañarlo (en una etapa aparte). Para compilar con EAS no hace falta.
