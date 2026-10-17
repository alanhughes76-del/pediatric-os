/**
 * "Mis datos" del portal (prompt maestro 7.19): la familia actualiza su teléfono, su email, cómo
 * prefiere que la contacten y sus direcciones. Cada cambio queda auditado y al Dr. le llega un aviso.
 * También ve su membresía.
 */
import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useApp, useSesionFamilia } from '@/data/store';
import { membresiaDeFamilia, pacientesDeAdulto } from '@/data/selectores';
import type { Address, ContactPreference } from '@/data/types';
import { fechaCorta } from '@/lib/fechas';
import { Pantalla } from '@/components/Pantalla';
import { BarraPacienteX } from '@/components/BotonPacienteX';
import { Seccion } from '@/components/Seccion';
import { Tarjeta } from '@/components/Tarjeta';
import { Campo, Opciones, Aviso } from '@/components/Formulario';
import { Boton } from '@/components/Boton';
import { Texto, TextoFuerte, TextoChico } from '@/components/Texto';
import { CampoEditable, CampoTelefono, BotonTexto, TEXTO_PREFERENCIA, validarEmail } from '@/components/ficha/piezas';
import { colors } from '@/theme';

const PREFERENCIAS = (Object.keys(TEXTO_PREFERENCIA) as ContactPreference[]).map((v) => ({ valor: v, texto: TEXTO_PREFERENCIA[v] }));
const ESTADO: Record<string, string> = { activa: 'Activa', 'por-vencer': 'Por renovar', vencida: 'Vencida' };

export default function MisDatos() {
  const { db, operaciones } = useApp();
  const { guardian: g } = useSesionFamilia();
  const [mensaje, setMensaje] = useState<{ tono: 'info' | 'alerta'; texto: string } | null>(null);
  const hijos = pacientesDeAdulto(db, g.id);
  const { membership, estado } = membresiaDeFamilia(db, hijos[0]?.familyId ?? g.familyId);
  const direcciones = db.addresses.filter((a) => a.guardianId === g.id && !a.archivedAt);

  const guardar = async (cambios: Parameters<typeof operaciones.actualizarMisDatos>[0]) => {
    const e = await operaciones.actualizarMisDatos(cambios);
    setMensaje(e ? { tono: 'alerta', texto: e } : { tono: 'info', texto: 'Guardado. Le avisamos al Dr. del cambio.' });
  };

  return (
    <Pantalla pie={<BarraPacienteX />}>
      {mensaje ? <Aviso tono={mensaje.tono} texto={mensaje.texto} /> : null}

      <Seccion titulo="Mis datos" bajada={`${g.firstName} ${g.lastName}`}>
        <Tarjeta style={{ gap: 14 }}>
          <CampoTelefono valor={g.phone} onGuardar={(phone) => void guardar({ phone })} />
          <CampoEditable etiqueta="Email" valor={g.email} keyboardType="email-address" placeholder="nombre@ejemplo.com"
            validar={(v) => (!v ? 'El email no puede quedar vacío: es con el que entrás.' : validarEmail(v))}
            onGuardar={(email) => void guardar({ email: email.toLowerCase() })} />
          <TextoChico>Tu email es con el que entrás al portal. Si lo cambiás, el próximo enlace te llega al nuevo.</TextoChico>
          <Opciones etiqueta="¿Cómo preferís que te contactemos?" opciones={PREFERENCIAS} valor={g.contactPreference}
            onCambio={(contactPreference) => void guardar({ contactPreference })} />
        </Tarjeta>
      </Seccion>

      <Seccion titulo="Mis direcciones" bajada="Donde te visita el Dr.">
        {direcciones.length === 0 ? <Texto color={colors.textMuted}>No tenés direcciones cargadas.</Texto> : null}
        {direcciones.map((a) => <Direccion key={a.id} direccion={a} onMensaje={setMensaje} />)}
        <Direccion onMensaje={setMensaje} />
      </Seccion>

      <Seccion titulo="Membresía">
        <Tarjeta style={{ gap: 6 }}>
          {membership ? (
            <>
              <TextoFuerte>{ESTADO[estado] ?? 'Sin membresía'}</TextoFuerte>
              <TextoChico>{estado === 'vencida' ? `Venció el ${fechaCorta(membership.renewalDate)}` : `Se renueva el ${fechaCorta(membership.renewalDate)}`}</TextoChico>
            </>
          ) : <Texto color={colors.textMuted}>No tenés una membresía activa.</Texto>}
          <TextoChico>Pagos y renovación: se suman más adelante. Si tenés dudas, escribime por PacienteX.</TextoChico>
        </Tarjeta>
      </Seccion>
    </Pantalla>
  );
}

/** Una dirección (editar) o el botón para agregar una nueva. */
function Direccion({ direccion: a, onMensaje }: { direccion?: Address; onMensaje: (m: { tono: 'info' | 'alerta'; texto: string }) => void }) {
  const { operaciones } = useApp();
  const [abierta, setAbierta] = useState(false);
  const [calle, setCalle] = useState(a?.street ?? '');
  const [localidad, setLocalidad] = useState(a?.locality ?? '');
  const [notas, setNotas] = useState(a?.notes ?? '');
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    setGuardando(true);
    const e = await operaciones.guardarDireccion({ id: a?.id, street: calle, locality: localidad, notes: notas });
    setGuardando(false);
    if (e) return onMensaje({ tono: 'alerta', texto: e });
    onMensaje({ tono: 'info', texto: 'Dirección guardada. Le avisamos al Dr. del cambio.' });
    setAbierta(false);
    if (!a) { setCalle(''); setLocalidad(''); setNotas(''); }
  };

  if (!abierta) {
    return a ? (
      <Tarjeta style={s.fila}>
        <View style={{ flex: 1 }}>
          <TextoFuerte>{a.street}</TextoFuerte>
          <TextoChico>{a.locality}{a.notes ? ` · ${a.notes}` : ''}</TextoChico>
        </View>
        <BotonTexto texto="Editar" onPress={() => setAbierta(true)} />
      </Tarjeta>
    ) : <Boton titulo="+ Agregar una dirección" variante="secundario" onPress={() => setAbierta(true)} />;
  }
  return (
    <Tarjeta style={{ gap: 12, borderColor: colors.primary3 }}>
      <Campo etiqueta="Calle y número" value={calle} onChangeText={setCalle} placeholder="Av. Maipú 1450, 3.º B" />
      <Campo etiqueta="Localidad o barrio" value={localidad} onChangeText={setLocalidad} placeholder="Vicente López" />
      <Campo etiqueta="Referencias (opcional)" value={notas} onChangeText={setNotas} placeholder="Timbre, portón, estacionamiento…" />
      <Boton titulo={guardando ? 'Guardando…' : 'Guardar'} icono="checkmark" deshabilitado={guardando} onPress={() => void guardar()} />
      <Boton titulo="Cancelar" variante="contorno" onPress={() => setAbierta(false)} />
    </Tarjeta>
  );
}

const s = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
