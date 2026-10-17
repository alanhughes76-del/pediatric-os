/**
 * Vincular un adulto responsable a un paciente: buscar uno ya cargado (por nombre o email)
 * o crear uno nuevo; elegir la relación (madre, padre u otro) y si es el contacto principal.
 * Los adultos nuevos arrancan sin acceso al portal: lo habilita el médico.
 */
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useApp, nuevoId } from '@/data/store';
import { adultosDe, paciente as buscarPaciente, nombreCompleto } from '@/data/selectores';
import type { Address, Guardian, PatientRelationship, RelationshipType } from '@/data/types';
import { normalizar } from '@/lib/busqueda';
import { hoyISO } from '@/lib/fechas';
import { Pantalla } from '@/components/Pantalla';
import { Campo, Opciones, Casilla, Aviso } from '@/components/Formulario';
import { Boton } from '@/components/Boton';
import { Tarjeta } from '@/components/Tarjeta';
import { Texto, TextoFuerte, TextoChico } from '@/components/Texto';
import { validarEmail } from '@/components/ficha/piezas';
import { colors } from '@/theme';

const RELACIONES: { valor: RelationshipType; texto: string }[] = [
  { valor: 'madre', texto: 'Madre' },
  { valor: 'padre', texto: 'Padre' },
  { valor: 'otro', texto: 'Otro' },
];

export default function VincularAdulto() {
  const { paciente: pid } = useLocalSearchParams<{ paciente: string }>();
  const { db, enLote } = useApp();
  const p = buscarPaciente(db, pid);
  const yaVinculados = useMemo(() => new Set(adultosDe(db, pid).map((a) => a.guardian.id)), [db, pid]);

  const [modo, setModo] = useState<'buscar' | 'nuevo'>('buscar');
  const [busqueda, setBusqueda] = useState('');
  const [elegido, setElegido] = useState<Guardian>();
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [calle, setCalle] = useState('');
  const [localidad, setLocalidad] = useState('');
  const [relacion, setRelacion] = useState<RelationshipType>();
  const [detalle, setDetalle] = useState('');
  const [principal, setPrincipal] = useState(yaVinculados.size === 0);
  const [intento, setIntento] = useState(false);

  const resultados = useMemo(() => {
    const q = normalizar(busqueda);
    if (!q) return [];
    return db.guardians
      .filter((g) => !g.archivedAt && !yaVinculados.has(g.id))
      .filter((g) => normalizar(`${g.firstName} ${g.lastName} ${g.email}`).includes(q))
      .slice(0, 8);
  }, [busqueda, db.guardians, yaVinculados]);

  if (!p) return <Pantalla><Texto>No encontramos a este paciente.</Texto></Pantalla>;

  const errores = {
    adulto: modo === 'buscar' && !elegido ? 'Elegí un adulto de la lista o creá uno nuevo.' : undefined,
    nombre: modo === 'nuevo' && (!nombre.trim() || !apellido.trim()) ? 'Completá nombre y apellido.' : undefined,
    email: modo === 'nuevo' ? validarEmail(email.trim()) : undefined,
    domicilio: modo === 'nuevo' && !!calle.trim() !== !!localidad.trim() ? 'Para el domicilio, completá calle y localidad (o dejá los dos vacíos).' : undefined,
    relacion: !relacion ? 'Elegí la relación.' : relacion === 'otro' && !detalle.trim() ? 'Aclará la relación (por ejemplo, "abuela").' : undefined,
  };
  const valido = !Object.values(errores).some(Boolean);

  const guardar = () => {
    setIntento(true);
    if (!valido || !relacion) return;
    enLote((d, { ahora, usuarioId, log }) => {
      const base = { createdAt: ahora, createdBy: usuarioId };
      let guardians = d.guardians;
      let addresses = d.addresses;
      let guardianId = elegido?.id;
      if (modo === 'nuevo') {
        const g: Guardian = {
          ...base, id: nuevoId('g'), familyId: p.familyId, firstName: nombre.trim(), lastName: apellido.trim(),
          email: email.trim(), phone: telefono.trim() || undefined, accessEnabled: false,
        };
        guardians = [...guardians, g];
        guardianId = g.id;
        log({ action: 'adulto.crear', entity: 'guardians', entityId: g.id });
        if (calle.trim()) {
          const a: Address = { ...base, id: nuevoId('ad'), guardianId: g.id, street: calle.trim(), locality: localidad.trim() };
          addresses = [...addresses, a];
          log({ action: 'domicilio.agregar', entity: 'addresses', entityId: a.id });
        }
      }
      const rel: PatientRelationship = {
        ...base, id: nuevoId('r'), patientId: p.id, guardianId: guardianId!, type: relacion,
        typeDetail: relacion === 'otro' ? detalle.trim() : undefined, isPrimary: principal, validFrom: hoyISO(),
      };
      log({ action: 'vinculo.crear', entity: 'relationships', entityId: rel.id });
      const relaciones = principal ? d.relationships.map((r) => (r.patientId === p.id ? { ...r, isPrimary: false } : r)) : d.relationships;
      return { ...d, guardians, addresses, relationships: [...relaciones, rel] };
    });
    router.back();
  };

  return (
    <Pantalla>
      <Stack.Screen options={{ title: 'Agregar adulto' }} />
      <TextoChico>Adulto responsable de {nombreCompleto(p)}</TextoChico>

      <Opciones
        opciones={[{ valor: 'buscar', texto: 'Buscar uno cargado' }, { valor: 'nuevo', texto: 'Crear uno nuevo' }]}
        valor={modo}
        onCambio={(v) => { setModo(v); setElegido(undefined); }}
      />

      {modo === 'buscar' ? (
        <View style={{ gap: 10 }}>
          <Campo value={busqueda} onChangeText={(v) => { setBusqueda(v); setElegido(undefined); }} placeholder="Nombre, apellido o email" autoCapitalize="none" autoCorrect={false} />
          {busqueda.trim() && resultados.length === 0 ? <Texto color={colors.textMuted}>No hay adultos con ese nombre. Podés crearlo nuevo.</Texto> : null}
          {resultados.map((g) => (
            <Tarjeta key={g.id} onPress={() => setElegido(g)} style={elegido?.id === g.id ? { borderColor: colors.accion, borderWidth: 2 } : undefined}>
              <TextoFuerte>{g.firstName} {g.lastName}</TextoFuerte>
              <TextoChico>{g.email}{g.phone ? ` · ${g.phone}` : ''}</TextoChico>
            </Tarjeta>
          ))}
          {intento && errores.adulto ? <Aviso tono="alerta" texto={errores.adulto} /> : null}
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          <Campo etiqueta="Nombre" value={nombre} onChangeText={setNombre} autoCapitalize="words" />
          <Campo etiqueta="Apellido" value={apellido} onChangeText={setApellido} autoCapitalize="words" error={intento ? errores.nombre : undefined} />
          <Campo etiqueta="Email (opcional)" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" error={intento ? errores.email : undefined}
            ayuda="Sin email no se puede habilitar el portal." />
          <Campo etiqueta="WhatsApp (opcional)" value={telefono} onChangeText={setTelefono} keyboardType="phone-pad" />
          <Campo etiqueta="Domicilio: calle y número (opcional)" value={calle} onChangeText={setCalle} />
          <Campo etiqueta="Localidad" value={localidad} onChangeText={setLocalidad} error={intento ? errores.domicilio : undefined} />
        </View>
      )}

      <Opciones etiqueta="Relación" opciones={RELACIONES} valor={relacion} onCambio={setRelacion} />
      {relacion === 'otro' ? <Campo etiqueta="¿Cuál?" value={detalle} onChangeText={setDetalle} placeholder="Abuela, tutora legal…" /> : null}
      {intento && errores.relacion ? <Aviso tono="alerta" texto={errores.relacion} /> : null}
      <Casilla marcada={principal} onCambio={setPrincipal} texto="Es el contacto principal" />

      <Boton titulo="Guardar" icono="checkmark" onPress={guardar} />
    </Pantalla>
  );
}
