/**
 * Registrar o corregir un pago (prompt maestro 7.16): fecha, monto, moneda, medio, concepto y familia.
 * Los que llegan "a confirmar" (bot de Telegram, Etapa 8) se confirman acá. Un pago no se borra: se archiva.
 * `?familia=` para uno nuevo; `?id=` para uno existente.
 */
import { useState } from 'react';
import { View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/data/store';
import { membresiaDeFamilia } from '@/data/selectores';
import type { Currency, PaymentMethod } from '@/data/types';
import { aNumero, dinero, precioMembresia } from '@/data/configuracion';
import { familiaDePago, TEXTO_MEDIO, TEXTO_PLAN } from '@/data/membresias';
import { aCampos, ahoraISO, deFecha } from '@/lib/fechas';
import { Pantalla } from '@/components/Pantalla';
import { Tarjeta } from '@/components/Tarjeta';
import { Campo, Casilla, Opciones, Aviso } from '@/components/Formulario';
import { Boton } from '@/components/Boton';
import { Subtitulo, TextoFuerte, TextoChico } from '@/components/Texto';
import { BotonTexto } from '@/components/ficha/piezas';
import { normalizar } from '@/lib/busqueda';
import { EstadoVacio } from '@/components/Estados';

const MONEDAS = [{ valor: 'ARS' as Currency, texto: 'Pesos' }, { valor: 'USD' as Currency, texto: 'Dólares' }];
const MEDIOS = (Object.keys(TEXTO_MEDIO) as PaymentMethod[]).map((v) => ({ valor: v, texto: TEXTO_MEDIO[v] }));

export default function Pago() {
  const { id, familia: familiaParam } = useLocalSearchParams<{ id?: string; familia?: string }>();
  const { db, agregar, actualizar } = useApp();
  const pago = id ? db.payments.find((p) => p.id === id) : undefined;
  // Un pago que llegó por Telegram puede no traer la familia: el Dr. la elige acá.
  const [familiaElegida, setFamiliaElegida] = useState<string>();
  const [busqueda, setBusqueda] = useState('');
  const familyId = familiaElegida ?? (pago ? familiaDePago(db, pago) : familiaParam);
  const familia = db.families.find((f) => f.id === familyId);
  const { membership } = membresiaDeFamilia(db, familyId);

  const [fecha, setFecha] = useState(aCampos(pago ? `${pago.date}T12:00:00-03:00` : ahoraISO()).fecha);
  const [monto, setMonto] = useState(pago ? String(pago.amount) : '');
  const [moneda, setMoneda] = useState<Currency>(pago?.currency ?? 'ARS');
  const [medio, setMedio] = useState<PaymentMethod>(pago?.method ?? 'transferencia');
  const [concepto, setConcepto] = useState(pago?.concept ?? '');
  const [deMembresia, setDeMembresia] = useState(pago ? !!pago.membershipId : false);
  const [error, setError] = useState<string | null>(null);
  const aConfirmar = pago?.status === 'a_confirmar';

  // Sin historial (se abrió por enlace), vuelve a la ficha de la familia.
  const volver = () => (router.canGoBack() ? router.back() : router.replace(`/medico/familia/${familyId ?? ""}`));

  if ((id && !pago) || (!id && !familia)) return <Pantalla><EstadoVacio icono="help-circle-outline" titulo="No encontramos este pago" /></Pantalla>;
  const q = normalizar(busqueda.trim());
  const opcionesFamilia = q.length < 2 ? [] : db.families.filter((f) => !f.archivedAt && normalizar(f.name).includes(q)).slice(0, 6);

  const guardar = (confirmar: boolean) => {
    if (!familia) return setError('Elegí la familia del pago.');
    const date = deFecha(fecha);
    const amount = aNumero(monto);
    if (!date) return setError('Revisá la fecha (dd/mm/aaaa).');
    if (!Number.isFinite(amount) || amount <= 0) return setError('Revisá el monto: un número mayor que cero.');
    if (!concepto.trim()) return setError('Escribí el concepto (por ejemplo, "Membresía anual" o "Visita del 12/10").');
    const datos = {
      familyId: familia.id, membershipId: deMembresia && membership ? membership.id : undefined,
      date, amount, currency: moneda, method: medio, concept: concepto.trim(),
      status: (confirmar || !pago ? 'confirmado' : pago.status ?? 'confirmado') as 'confirmado' | 'a_confirmar',
    };
    if (pago) actualizar('payments', pago.id, datos, confirmar ? 'pago.confirmar' : 'pago.editar');
    else agregar('payments', datos, 'pago.registrar');
    volver();
  };

  const archivar = () => {
    if (!pago) return;
    actualizar('payments', pago.id, { archivedAt: ahoraISO() }, 'pago.archivar');
    volver();
  };

  const sugerido = membership ? precioMembresia(db.precios, membership.plan, membership.patientIds.length) : null;

  return (
    <Pantalla>
      <Stack.Screen options={{ title: pago ? 'Pago' : 'Registrar pago' }} />
      {familia ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Subtitulo style={{ flex: 1 }}>{familia.name}</Subtitulo>
          {pago?.status === 'a_confirmar' ? <BotonTexto texto="Cambiar" onPress={() => { setFamiliaElegida(undefined); setBusqueda(''); }} /> : null}
        </View>
      ) : (
        <Tarjeta style={{ gap: 8 }}>
          <TextoFuerte>¿De qué familia es este pago?</TextoFuerte>
          <TextoChico>No la reconocimos en el mensaje.</TextoChico>
          <Campo value={busqueda} onChangeText={setBusqueda} placeholder="Escribí el apellido" autoCorrect={false} accessibilityLabel="Buscar familia" />
          {opcionesFamilia.map((f) => <BotonTexto key={f.id} texto={f.name} onPress={() => { setFamiliaElegida(f.id); setBusqueda(''); }} />)}
        </Tarjeta>
      )}
      {aConfirmar ? <Aviso texto="Este pago llegó por una automatización y falta que lo confirmes. Revisá los datos y tocá Confirmar." /> : null}
      <Tarjeta style={{ gap: 14 }}>
        <Campo etiqueta="Fecha" value={fecha} onChangeText={setFecha} placeholder="dd/mm/aaaa" keyboardType="numbers-and-punctuation" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }}>
          <View style={{ flex: 1, minWidth: 150 }}><Campo etiqueta="Monto" value={monto} onChangeText={setMonto} keyboardType="numeric" placeholder="150.000" /></View>
          <Opciones opciones={MONEDAS} valor={moneda} onCambio={setMoneda} />
        </View>
        <Opciones etiqueta="Medio de pago" opciones={MEDIOS} valor={medio} onCambio={setMedio} />
        <Campo etiqueta="Concepto" value={concepto} onChangeText={setConcepto} placeholder="Membresía anual, Visita del 12/10…" />
        {membership ? (
          <Casilla texto={`Es un pago de la membresía (${TEXTO_PLAN[membership.plan].toLowerCase()})`} marcada={deMembresia} onCambio={setDeMembresia}
            detalle={sugerido ? `Precio de lista: ${dinero(sugerido.monto, sugerido.moneda)}` : undefined} />
        ) : null}
        <TextoChico>{db.precios.membresia.conversion}</TextoChico>
      </Tarjeta>
      {error ? <Aviso tono="alerta" texto={error} /> : null}
      {aConfirmar
        ? <Boton titulo="Confirmar el pago" icono="checkmark-circle" onPress={() => guardar(true)} />
        : <Boton titulo="Guardar" icono="checkmark" onPress={() => guardar(false)} />}
      {pago ? <Boton titulo={aConfirmar ? 'No corresponde: archivarlo' : 'Archivar este pago'} variante="contorno" onPress={archivar} /> : null}
      <TextoChico>Los pagos no se borran: si uno estuvo mal cargado, se archiva y queda en la auditoría.</TextoChico>
    </Pantalla>
  );
}
