/**
 * Nueva familia: nombre, zona y el primer adulto responsable (con email y teléfono opcionales).
 * El adulto arranca sin acceso al portal. Los hijos se cargan después desde la ficha de la familia.
 */
import { useState } from 'react';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useApp, nuevoId } from '@/data/store';
import type { ContactPreference, Family, Guardian } from '@/data/types';
import { normalizarTelefono } from '@shared/telefono';
import { Pantalla } from '@/components/Pantalla';
import { Seccion } from '@/components/Seccion';
import { Tarjeta } from '@/components/Tarjeta';
import { Campo, Opciones } from '@/components/Formulario';
import { Boton } from '@/components/Boton';
import { TextoChico } from '@/components/Texto';
import { TEXTO_PREFERENCIA, validarEmail } from '@/components/ficha/piezas';

const ZONAS = ['CABA', 'GBA Zona Norte', 'Otra'] as const;
type Zona = (typeof ZONAS)[number];

export default function NuevaFamilia() {
  const { db, enLote, operaciones } = useApp();
  // Desde Interesados: se precargan nombre, email y teléfono, y al guardar queda marcado como familia.
  const { interesado: interesadoId } = useLocalSearchParams<{ interesado?: string }>();
  const interesado = db.interesados.find((x) => x.id === interesadoId);
  const [nombreInicial, ...resto] = (interesado?.nombre ?? '').split(' ');
  const [apellidoFamilia, setApellidoFamilia] = useState(resto.join(' '));
  const [zona, setZona] = useState<Zona>();
  const [nombre, setNombre] = useState(nombreInicial ?? '');
  const [apellido, setApellido] = useState(resto.join(' '));
  const [email, setEmail] = useState(interesado?.email ?? '');
  const [telefono, setTelefono] = useState(interesado?.telefono ?? '');
  const [preferencia, setPreferencia] = useState<ContactPreference>('llamada');
  const [intento, setIntento] = useState(false);

  const errores = {
    familia: !apellidoFamilia.trim() ? 'Escribí el apellido de la familia.' : undefined,
    adulto: !nombre.trim() || !apellido.trim() ? 'Completá nombre y apellido del adulto.' : undefined,
    email: email.trim() ? validarEmail(email.trim()) : undefined,
    telefono: telefono.trim() && !normalizarTelefono(telefono) ? 'Revisá el número: código de área y número (por ejemplo, 11 5555-0000).' : undefined,
  };
  const valido = !Object.values(errores).some(Boolean);

  const guardar = () => {
    setIntento(true);
    if (!valido) return;
    const familyId = nuevoId('f');
    enLote((d, { ahora, usuarioId, log }) => {
      const base = { createdAt: ahora, createdBy: usuarioId };
      const f: Family = { ...base, id: familyId, name: `Familia ${apellidoFamilia.trim()}`, zone: zona === 'Otra' ? undefined : zona, status: 'activa' };
      const g: Guardian = {
        ...base, id: nuevoId('g'), familyId, firstName: nombre.trim(), lastName: apellido.trim(),
        email: email.trim(), phone: normalizarTelefono(telefono) ?? undefined, contactPreference: preferencia, accessEnabled: false,
      };
      log({ action: 'familia.crear', entity: 'families', entityId: f.id });
      log({ action: 'adulto.crear', entity: 'guardians', entityId: g.id });
      return { ...d, families: [...d.families, f], guardians: [...d.guardians, g] };
    });
    if (interesado) void operaciones.actualizarEntrada('interesados', interesado.id, { estado: 'familia', familyId });
    router.replace(`/medico/familia/${familyId}`);
  };

  return (
    <Pantalla>
      <Stack.Screen options={{ title: 'Nueva familia' }} />
      <Seccion titulo="Familia">
        <Tarjeta style={{ gap: 14 }}>
          <Campo etiqueta="Apellido de la familia" value={apellidoFamilia} onChangeText={setApellidoFamilia} autoCapitalize="words" placeholder="Ej.: Ruiz Ferreyra" error={intento ? errores.familia : undefined} />
          <Opciones etiqueta="Zona" opciones={ZONAS.map((z) => ({ valor: z, texto: z }))} valor={zona} onCambio={setZona} />
        </Tarjeta>
      </Seccion>
      <Seccion titulo="Primer adulto responsable" bajada="Después podés sumar más adultos, cada uno con sus domicilios">
        <Tarjeta style={{ gap: 14 }}>
          <Campo etiqueta="Nombre" value={nombre} onChangeText={setNombre} autoCapitalize="words" error={intento ? errores.adulto : undefined} />
          <Campo etiqueta="Apellido" value={apellido} onChangeText={setApellido} autoCapitalize="words" />
          <Campo etiqueta="Email (opcional)" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="nombre@ejemplo.com" error={intento ? errores.email : undefined} />
          <Campo etiqueta="Teléfono (opcional)" value={telefono} onChangeText={setTelefono} keyboardType="phone-pad" placeholder="11 5555-0000" error={intento ? errores.telefono : undefined} />
          <Opciones<ContactPreference>
            etiqueta="Prefiere que lo contacten por"
            opciones={(Object.keys(TEXTO_PREFERENCIA) as ContactPreference[]).map((v) => ({ valor: v, texto: TEXTO_PREFERENCIA[v] }))}
            valor={preferencia}
            onCambio={setPreferencia}
          />
          <TextoChico>Arranca sin acceso al portal. Lo habilitás desde su ficha (hace falta el email).</TextoChico>
        </Tarjeta>
      </Seccion>
      <Boton titulo="Guardar familia" icono="checkmark" onPress={guardar} />
    </Pantalla>
  );
}
