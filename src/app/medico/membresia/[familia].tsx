/**
 * Membresía de una familia (prompt maestro 7.16): plan, alta, renovación, estado, hijos incluidos y
 * observaciones. Muestra el precio de lista según Configuración (es una referencia, no un cobro).
 * Una renovación es una membresía nueva: la anterior queda en el historial.
 */
import { useState } from 'react';
import { View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/data/store';
import { membresiaDeFamilia } from '@/data/selectores';
import type { EstadoMembresiaGuardado, Plan } from '@/data/types';
import { dinero, precioMembresia, renovacionSugerida } from '@/data/configuracion';
import { TEXTO_PLAN } from '@/data/membresias';
import { aCampos, deFecha, fechaCorta, hoyISO } from '@/lib/fechas';
import { Pantalla } from '@/components/Pantalla';
import { Tarjeta } from '@/components/Tarjeta';
import { Campo, Casilla, Opciones, Aviso } from '@/components/Formulario';
import { Boton } from '@/components/Boton';
import { Subtitulo, TextoFuerte, TextoChico } from '@/components/Texto';
import { EstadoVacio } from '@/components/Estados';

const ESTADOS: { valor: EstadoMembresiaGuardado; texto: string; detalle: string }[] = [
  { valor: 'activa', texto: 'Activa', detalle: '"Por renovar" y "vencida" se calculan con la fecha de renovación' },
  { valor: 'suspendida', texto: 'Suspendida', detalle: 'No puede pedir visitas como miembro; sigue viendo todo' },
  { valor: 'cancelada', texto: 'Cancelada', detalle: 'Deja de ser miembro; pide visitas como cualquier familia' },
];

const fechaDe = (iso: string) => aCampos(`${iso}T12:00:00-03:00`).fecha;

export default function MembresiaFamilia() {
  const { familia: familyId, nueva } = useLocalSearchParams<{ familia: string; nueva?: string }>();
  const { db, agregar, actualizar } = useApp();
  const familia = db.families.find((f) => f.id === familyId);
  const actual = nueva ? undefined : membresiaDeFamilia(db, familyId).membership;
  const hijos = db.patients.filter((p) => p.familyId === familyId && !p.archivedAt);

  const [plan, setPlan] = useState<Plan>(actual?.plan ?? 'anual');
  const [desde, setDesde] = useState(fechaDe(actual?.startDate ?? hoyISO()));
  const [renueva, setRenueva] = useState(fechaDe(actual?.renewalDate ?? renovacionSugerida(hoyISO(), 'anual')));
  const [renuevaTocada, setRenuevaTocada] = useState(!!actual);
  // null = sin tocar: los de la membresía actual o todos los hijos (también si los datos llegan después).
  const [elegidos, setIncluidos] = useState<string[] | null>(null);
  const incluidos = elegidos ?? actual?.patientIds ?? hijos.map((h) => h.id);
  const [estado, setEstado] = useState<EstadoMembresiaGuardado>(actual?.status === 'vencida' ? 'activa' : actual?.status ?? 'activa');
  const [notas, setNotas] = useState(actual?.notes ?? '');
  const [error, setError] = useState<string | null>(null);

  // Sin historial (se abrió por enlace), vuelve a la ficha de la familia.
  const volver = () => (router.canGoBack() ? router.back() : router.replace(`/medico/familia/${familyId}`));

  if (!familia) return <Pantalla><EstadoVacio icono="help-circle-outline" titulo="No encontramos esta familia" /></Pantalla>;

  // Mientras no toque la fecha de renovación, se sugiere sola según el plan y el alta.
  const sugerir = (p: Plan, d: string) => {
    const iso = deFecha(d);
    if (!renuevaTocada && iso) setRenueva(fechaDe(renovacionSugerida(iso, p)));
  };
  const precio = precioMembresia(db.precios, plan, incluidos.length);

  const guardar = () => {
    const startDate = deFecha(desde);
    const renewalDate = deFecha(renueva);
    if (!startDate || !renewalDate) return setError('Revisá las fechas (dd/mm/aaaa).');
    if (renewalDate <= startDate) return setError('La renovación tiene que ser después del alta.');
    if (incluidos.length === 0) return setError('Elegí al menos un hijo incluido.');
    const datos = { familyId, plan, startDate, renewalDate, status: estado, patientIds: incluidos, notes: notas.trim() || undefined };
    if (actual) actualizar('memberships', actual.id, datos, 'membresia.editar');
    else agregar('memberships', datos, 'membresia.crear');
    volver();
  };

  return (
    <Pantalla>
      <Stack.Screen options={{ title: actual ? 'Membresía' : 'Nueva membresía' }} />
      <Subtitulo>{familia.name}</Subtitulo>
      {actual ? <TextoChico>Para renovar, cargá una membresía nueva: esta queda en el historial.</TextoChico> : null}
      <Tarjeta style={{ gap: 14 }}>
        <Opciones etiqueta="Plan" opciones={(['anual', 'semestral'] as Plan[]).map((v) => ({ valor: v, texto: TEXTO_PLAN[v] }))} valor={plan}
          onCambio={(v) => { setPlan(v); sugerir(v, desde); }} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <View style={{ flex: 1, minWidth: 150 }}>
            <Campo etiqueta="Alta" value={desde} placeholder="dd/mm/aaaa" keyboardType="numbers-and-punctuation" onChangeText={(v) => { setDesde(v); sugerir(plan, v); }} />
          </View>
          <View style={{ flex: 1, minWidth: 150 }}>
            <Campo etiqueta="Próxima renovación" value={renueva} placeholder="dd/mm/aaaa" keyboardType="numbers-and-punctuation" onChangeText={(v) => { setRenueva(v); setRenuevaTocada(true); }} />
          </View>
        </View>
        <View style={{ gap: 4 }}>
          <TextoFuerte>Hijos incluidos</TextoFuerte>
          {hijos.map((h) => (
            <Casilla key={h.id} texto={`${h.firstName} ${h.lastName}`} marcada={incluidos.includes(h.id)}
              onCambio={(v) => setIncluidos(v ? [...incluidos, h.id] : incluidos.filter((x) => x !== h.id))} />
          ))}
        </View>
        <TextoChico>Precio de lista: {dinero(precio.monto, precio.moneda)} · {precio.detalle}. Se cambia en Configuración.</TextoChico>
        <Opciones etiqueta="Estado" columna opciones={ESTADOS} valor={estado} onCambio={setEstado} />
        <Campo etiqueta="Observaciones (la familia no las ve)" value={notas} onChangeText={setNotas} multiline />
        {actual ? <TextoChico>Alta original: {fechaCorta(actual.startDate)}.</TextoChico> : null}
      </Tarjeta>
      {error ? <Aviso tono="alerta" texto={error} /> : null}
      <Boton titulo="Guardar" icono="checkmark" onPress={guardar} />
    </Pantalla>
  );
}
