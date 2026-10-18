/**
 * Activa el segundo factor con app de autenticación (TOTP) en el proyecto real (una sola vez,
 * docs/INSTALACION.md). Antes hay que pasar Authentication a Identity Platform en la consola.
 * Necesita credenciales de administrador (`gcloud auth application-default login`).
 *
 *   npx tsx scripts/activar-segundo-factor.ts --proyecto pediatric-os
 *
 * Los emuladores de Firebase no admiten TOTP: este script no tiene modo emulador.
 */
import { initializeApp } from 'firebase-admin/app';
import { getAuth, type UpdateProjectConfigRequest } from 'firebase-admin/auth';

const i = process.argv.indexOf('--proyecto');
const proyecto = i > 0 ? process.argv[i + 1] : undefined;
if (!proyecto || proyecto.startsWith('demo-')) {
  console.error('Uso: npx tsx scripts/activar-segundo-factor.ts --proyecto <id del proyecto real>');
  process.exit(1);
}

initializeApp({ projectId: proyecto });

(async () => {
  const gestor = getAuth().projectConfigManager();
  // Como en la guía de Firebase para TOTP: solo se toca el proveedor TOTP (los SMS no se activan).
  // Los tipos del SDK piden además `state`, que corresponde a los SMS; por eso el cast.
  // adjacentIntervals: 5 acepta el código de hasta 2,5 minutos antes o después (relojes desfasados).
  const cambio = { multiFactorConfig: { providerConfigs: [{ state: 'ENABLED', totpProviderConfig: { adjacentIntervals: 5 } }] } };
  await gestor.updateProjectConfig(cambio as unknown as UpdateProjectConfigRequest);
  const ahora = await gestor.getProjectConfig();
  console.log(`Segundo factor en ${proyecto}:`, JSON.stringify(ahora.multiFactorConfig ?? {}, null, 2));
  console.log('Ahora entrá a la app como médico y activalo en Configuración › Seguridad.');
})().catch((e: Error) => {
  console.error(`No se pudo activar: ${e.message}`);
  console.error('¿Pasaste Authentication a Identity Platform en la consola? ¿Tenés permisos de administrador?');
  process.exit(1);
});
