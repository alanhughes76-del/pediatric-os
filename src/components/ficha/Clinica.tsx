/**
 * Bloques clínicos de la ficha del médico: Problemas de salud, Alergias y Plan de cuidado.
 * Nada se borra: los cambios de estado quedan en el registro de auditoría.
 */
import { CampoFecha } from '@/components/CampoFecha';
import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/data/store';
import type { Allergy, CarePlanCategory } from '@/data/types';
import { ahoraISO, deFecha, diasEntre, fechaCorta, hoyISO } from '@/lib/fechas';
import { Seccion } from '../Seccion';
import { Tarjeta } from '../Tarjeta';
import { Etiqueta } from '../Etiqueta';
import { Campo, Opciones, Interruptor } from '../Formulario';
import { Texto, TextoFuerte, TextoChico } from '../Texto';
import { Agregar, BotonTexto } from './piezas';
import { colors, fonts } from '@/theme';

const fechaOpcional = (t: string) => (t.trim() ? deFecha(t) : undefined);

// ---------- Problemas de salud ----------

export function BloqueProblemas({ patientId }: { patientId: string }) {
  const { db, actualizar, agregar } = useApp();
  const problemas = db.problems
    .filter((p) => p.patientId === patientId && !p.archivedAt)
    .sort((a, b) => (a.status === b.status ? (b.since ?? '').localeCompare(a.since ?? '') : a.status === 'activo' ? -1 : 1));
  const [descripcion, setDescripcion] = useState('');
  const [desde, setDesde] = useState('');
  const [error, setError] = useState<string>();

  return (
    <Seccion titulo="Problemas de salud" bajada="Ocultos para la familia hasta que prendas el interruptor">
      {problemas.length === 0 ? <Texto color={colors.textMuted}>Sin problemas de salud cargados.</Texto> : null}
      {problemas.map((p) => (
        <Tarjeta key={p.id} style={{ gap: 8 }}>
          <View style={s.fila}>
            <TextoFuerte style={{ flex: 1 }}>{p.description}</TextoFuerte>
            <Etiqueta texto={p.status === 'activo' ? 'Activo' : 'Resuelto'} tono={p.status === 'activo' ? 'celeste' : 'neutro'} />
          </View>
          <TextoChico>
            {p.since ? `Desde ${fechaCorta(p.since)}` : 'Sin fecha de inicio'}
            {p.status === 'resuelto' && p.resolvedDate ? ` · Resuelto el ${fechaCorta(p.resolvedDate)}` : ''}
          </TextoChico>
          <Interruptor
            texto="Lo ve la familia"
            activo={p.visibleToFamily}
            onCambio={(v) => actualizar('problems', p.id, { visibleToFamily: v }, v ? 'problema.mostrar' : 'problema.ocultar')}
          />
          <View style={s.acciones}>
            {p.status === 'activo' ? (
              <BotonTexto texto="Marcar resuelto" onPress={() => actualizar('problems', p.id, { status: 'resuelto', resolvedDate: hoyISO() }, 'problema.resolver')} />
            ) : (
              <BotonTexto texto="Reabrir" onPress={() => actualizar('problems', p.id, { status: 'activo', resolvedDate: undefined }, 'problema.reabrir')} />
            )}
          </View>
        </Tarjeta>
      ))}
      <Agregar
        titulo="Agregar problema"
        alCancelar={() => { setDescripcion(''); setDesde(''); setError(undefined); }}
        guardar={() => {
          const inicio = fechaOpcional(desde);
          if (!descripcion.trim()) { setError('Escribí la descripción.'); return false; }
          if (inicio === null) { setError('Revisá la fecha de inicio.'); return false; }
          agregar('problems', { patientId, description: descripcion.trim(), since: inicio, status: 'activo', visibleToFamily: false }, 'problema.crear');
          setDescripcion(''); setDesde(''); setError(undefined);
          return true;
        }}
      >
        <Campo etiqueta="Descripción" value={descripcion} onChangeText={setDescripcion} placeholder="Ej.: Asma leve intermitente" />
        <CampoFecha opcional etiqueta="Fecha de inicio (opcional)" value={desde} onChangeText={setDesde} error={error} />
        <TextoChico>Arranca oculto para la familia.</TextoChico>
      </Agregar>
    </Seccion>
  );
}

// ---------- Alergias ----------

const GRAVEDAD: { valor: Allergy['severity']; texto: string }[] = [
  { valor: 'leve', texto: 'Leve' },
  { valor: 'moderada', texto: 'Moderada' },
  { valor: 'grave', texto: 'Grave' },
];
const ESTADO_ALERGIA: { valor: Allergy['status']; texto: string }[] = [
  { valor: 'referida', texto: 'Referida' },
  { valor: 'confirmada', texto: 'Confirmada' },
];

export function BloqueAlergias({ patientId }: { patientId: string }) {
  const { db, actualizar, agregar } = useApp();
  const alergias = db.allergies
    .filter((a) => a.patientId === patientId && !a.archivedAt)
    .sort((a, b) => (a.status === b.status ? a.allergen.localeCompare(b.allergen) : a.status === 'confirmada' ? -1 : 1));
  const [alergeno, setAlergeno] = useState('');
  const [reaccion, setReaccion] = useState('');
  const [gravedad, setGravedad] = useState<Allergy['severity']>();
  const [estado, setEstado] = useState<Allergy['status']>('referida');
  const [error, setError] = useState<string>();

  return (
    <Seccion titulo="Alergias">
      <TextoChico style={{ fontFamily: fonts.bodySemi }}>La familia ve siempre las confirmadas y nunca las referidas.</TextoChico>
      {alergias.length === 0 ? <Texto color={colors.textMuted}>Sin alergias cargadas.</Texto> : null}
      {alergias.map((a) => {
        const confirmada = a.status === 'confirmada';
        return (
          <Tarjeta key={a.id} style={[{ gap: 6 }, confirmada && { borderColor: colors.alertBorder, backgroundColor: colors.alertBg }]}>
            <View style={s.fila}>
              {confirmada ? <Ionicons name="warning" size={20} color={colors.alert} /> : null}
              <TextoFuerte style={{ flex: 1 }} color={confirmada ? colors.alert : undefined}>{a.allergen}</TextoFuerte>
              <Etiqueta texto={confirmada ? 'Confirmada' : 'Referida'} tono={confirmada ? 'alerta' : 'neutro'} />
            </View>
            <TextoChico>{a.reaction ? `${a.reaction} · ` : ''}Gravedad {a.severity}</TextoChico>
            <View style={s.acciones}>
              {confirmada ? (
                <BotonTexto texto="Pasar a referida" onPress={() => actualizar('allergies', a.id, { status: 'referida' }, 'alergia.referida')} />
              ) : (
                <BotonTexto texto="Confirmar" onPress={() => actualizar('allergies', a.id, { status: 'confirmada' }, 'alergia.confirmar')} />
              )}
            </View>
          </Tarjeta>
        );
      })}
      <Agregar
        titulo="Agregar alergia"
        alCancelar={() => { setAlergeno(''); setReaccion(''); setGravedad(undefined); setEstado('referida'); setError(undefined); }}
        guardar={() => {
          if (!alergeno.trim() || !gravedad) { setError('Completá el alérgeno y la gravedad.'); return false; }
          agregar('allergies', { patientId, allergen: alergeno.trim(), reaction: reaccion.trim() || undefined, severity: gravedad, status: estado }, 'alergia.crear');
          setAlergeno(''); setReaccion(''); setGravedad(undefined); setEstado('referida'); setError(undefined);
          return true;
        }}
      >
        <Campo etiqueta="Alérgeno" value={alergeno} onChangeText={setAlergeno} placeholder="Ej.: Amoxicilina" />
        <Campo etiqueta="Reacción (opcional)" value={reaccion} onChangeText={setReaccion} placeholder="Ej.: Urticaria" />
        <Opciones etiqueta="Gravedad" opciones={GRAVEDAD} valor={gravedad} onCambio={setGravedad} />
        <Opciones etiqueta="Estado" opciones={ESTADO_ALERGIA} valor={estado} onCambio={setEstado} />
        {error ? <TextoChico color={colors.alert}>{error}</TextoChico> : null}
      </Agregar>
    </Seccion>
  );
}

// ---------- Plan de cuidado ----------

const CATEGORIAS: { valor: CarePlanCategory; texto: string }[] = [
  { valor: 'control', texto: 'Control' },
  { valor: 'prevencion', texto: 'Prevención' },
  { valor: 'vacuna', texto: 'Vacuna' },
  { valor: 'estudio', texto: 'Estudio' },
  { valor: 'otro', texto: 'Otro' },
];
const TEXTO_CATEGORIA = Object.fromEntries(CATEGORIAS.map((c) => [c.valor, c.texto])) as Record<CarePlanCategory, string>;

export function BloquePlan({ patientId }: { patientId: string }) {
  const { db, actualizar, agregar } = useApp();
  const hoy = hoyISO();
  const plan = db.carePlan
    .filter((i) => i.patientId === patientId && !i.archivedAt)
    .sort((a, b) => Number(a.done || !!a.cancelledAt) - Number(b.done || !!b.cancelledAt) || (a.targetDate ?? '9').localeCompare(b.targetDate ?? '9'));
  const [categoria, setCategoria] = useState<CarePlanCategory>();
  const [descripcion, setDescripcion] = useState('');
  const [fecha, setFecha] = useState('');
  const [error, setError] = useState<string>();

  return (
    <>
      <Seccion titulo="Plan de cuidado" bajada="La familia ve los pendientes como «Plan vigente»">
        {plan.length === 0 ? <Texto color={colors.textMuted}>Sin ítems en el plan.</Texto> : null}
        {plan.map((i) => {
          const cancelado = !!i.cancelledAt;
          const cerrado = i.done || cancelado;
          const vencido = !cerrado && !!i.targetDate && diasEntre(i.targetDate, hoy) > 0;
          return (
            <Tarjeta key={i.id} style={[{ gap: 6 }, vencido && { borderColor: colors.alertBorder }]}>
              <View style={s.fila}>
                <Ionicons name={cancelado ? 'close-circle-outline' : i.done ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={cerrado ? colors.primary3 : colors.primary2} />
                <TextoFuerte style={[{ flex: 1 }, cerrado && { color: colors.textMuted }]}>{i.description}</TextoFuerte>
                {vencido ? <Etiqueta texto="Vencido" tono="alerta" /> : null}
                {cancelado ? <Etiqueta texto="Cancelado" tono="neutro" /> : null}
              </View>
              <TextoChico>
                {TEXTO_CATEGORIA[i.category]}
                {i.targetDate ? ` · Fecha objetivo ${fechaCorta(i.targetDate)}` : ''}
                {i.done && i.doneAt ? ` · ${i.category === 'vacuna' ? 'Aplicada' : 'Hecho'} el ${fechaCorta(i.doneAt)}` : ''}
              </TextoChico>
              <View style={s.acciones}>
                {cerrado ? (
                  <BotonTexto texto="Reabrir" onPress={() => actualizar('carePlan', i.id, { done: false, doneAt: undefined, cancelledAt: undefined }, 'plan.reabrir')} />
                ) : (
                  <>
                    <BotonTexto texto="Marcar hecho" onPress={() => actualizar('carePlan', i.id, { done: true, doneAt: ahoraISO() }, 'plan.hecho')} />
                    <BotonTexto texto="Cancelar" onPress={() => actualizar('carePlan', i.id, { cancelledAt: ahoraISO() }, 'plan.cancelar')} />
                  </>
                )}
              </View>
            </Tarjeta>
          );
        })}
        <Agregar
          titulo="Agregar ítem"
          alCancelar={() => { setCategoria(undefined); setDescripcion(''); setFecha(''); setError(undefined); }}
          guardar={() => {
            const objetivo = fechaOpcional(fecha);
            if (!categoria || !descripcion.trim()) { setError('Elegí la categoría y escribí la descripción.'); return false; }
            if (objetivo === null) { setError('Revisá la fecha objetivo.'); return false; }
            agregar('carePlan', { patientId, category: categoria, description: descripcion.trim(), targetDate: objetivo, done: false }, 'plan.crear');
            setCategoria(undefined); setDescripcion(''); setFecha(''); setError(undefined);
            return true;
          }}
        >
          <Opciones etiqueta="Categoría" opciones={CATEGORIAS} valor={categoria} onCambio={setCategoria} />
          <Campo etiqueta="Descripción" value={descripcion} onChangeText={setDescripcion} placeholder="Ej.: Triple viral, 2.ª dosis" />
          <CampoFecha opcional etiqueta="Fecha objetivo (opcional)" value={fecha} onChangeText={setFecha} />
          {error ? <TextoChico color={colors.alert}>{error}</TextoChico> : null}
        </Agregar>
      </Seccion>
    </>
  );
}

const s = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 4 },
  separador: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
});
