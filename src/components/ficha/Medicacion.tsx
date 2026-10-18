/**
 * Medicaciones y prescripciones (prompt maestro 7.9 y regla 11).
 * - Medicación actual: la dosis la escribe el médico. La plataforma nunca sugiere ni calcula dosis.
 * - Prescripciones: registro de lo indicado. La receta con validez legal se emite en la plataforma
 *   registrada (ReNaPDiS): el botón la abre. Se puede adjuntar el PDF de la receta emitida.
 */
import { CampoFecha } from '@/components/CampoFecha';
import { useState } from 'react';
import { View, Linking, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '@/data/store';
import type { Patient } from '@/data/types';
import { medicacionDe, prescripcionesDe } from '@/data/seguimientoClinico';
import { consultasDe, TEXTO_VISITA } from '@/data/selectores';
import { aCampos, ahoraISO, deFecha, fechaCorta, hoyISO } from '@/lib/fechas';
import { Seccion } from '../Seccion';
import { Tarjeta } from '../Tarjeta';
import { Etiqueta } from '../Etiqueta';
import { Boton } from '../Boton';
import { Campo, Opciones } from '../Formulario';
import { Texto, TextoFuerte, TextoChico } from '../Texto';
import { Agregar, BotonTexto } from './piezas';
import { BotonAdjuntar, ListaAdjuntos } from '../documentos/Adjuntos';
import { colors } from '@/theme';

const fechaOpcional = (t: string) => (t.trim() ? deFecha(t) : undefined);

export function BloqueMedicacion({ paciente: p }: { paciente: Patient }) {
  const { db, agregar, actualizar } = useApp();
  const hoy = hoyISO();
  const { activas, anteriores } = medicacionDe(db, p.id, hoy);
  const [verAnteriores, setVerAnteriores] = useState(false);
  const [m, setM] = useState({ drug: '', presentation: '', dose: '', frequency: '', desde: aCampos(ahoraISO()).fecha, hasta: '', indication: '' });
  const [error, setError] = useState<string>();
  const poner = (k: keyof typeof m) => (v: string) => setM((x) => ({ ...x, [k]: v }));

  return (
    <Seccion titulo="Medicación actual" bajada="La dosis la escribís vos: la plataforma no sugiere ni calcula dosis">
      {activas.length === 0 ? <Texto color={colors.textMuted}>Sin medicación activa.</Texto> : null}
      {activas.map((x) => (
        <Tarjeta key={x.id} style={{ gap: 4 }}>
          <TextoFuerte>{x.drug}{x.presentation ? ` · ${x.presentation}` : ''}</TextoFuerte>
          <Texto>{x.dose}{x.frequency ? ` · ${x.frequency}` : ''}</Texto>
          <TextoChico>
            Desde {fechaCorta(x.startDate)}{x.endDate ? ` hasta ${fechaCorta(x.endDate)}` : ''}{x.indication ? ` · ${x.indication}` : ''}
          </TextoChico>
          <View style={s.acciones}>
            <BotonTexto texto="Suspender hoy" onPress={() => actualizar('medications', x.id, { endDate: hoy, updatedAt: ahoraISO() }, 'medicacion.suspender')} />
          </View>
        </Tarjeta>
      ))}
      {anteriores.length > 0 ? (
        <>
          <BotonTexto texto={verAnteriores ? 'Ocultar la medicación anterior' : `Ver la medicación anterior (${anteriores.length})`} onPress={() => setVerAnteriores((v) => !v)} />
          {verAnteriores ? anteriores.map((x) => (
            <Tarjeta key={x.id} style={{ gap: 4, opacity: 0.75 }}>
              <TextoFuerte>{x.drug}{x.presentation ? ` · ${x.presentation}` : ''}</TextoFuerte>
              <TextoChico>{x.dose}{x.frequency ? ` · ${x.frequency}` : ''} · {fechaCorta(x.startDate)} a {fechaCorta(x.endDate!)}</TextoChico>
            </Tarjeta>
          )) : null}
        </>
      ) : null}
      <Agregar
        titulo="Agregar medicación"
        alCancelar={() => { setM({ drug: '', presentation: '', dose: '', frequency: '', desde: aCampos(ahoraISO()).fecha, hasta: '', indication: '' }); setError(undefined); }}
        guardar={() => {
          const desde = deFecha(m.desde);
          const hasta = fechaOpcional(m.hasta);
          if (!m.drug.trim() || !m.dose.trim()) { setError('Escribí el fármaco y la dosis.'); return false; }
          if (!desde) { setError('Revisá la fecha de inicio.'); return false; }
          if (hasta === null || (hasta && hasta < desde)) { setError('Revisá la fecha de fin: tiene que ser posterior al inicio.'); return false; }
          agregar('medications', {
            patientId: p.id, drug: m.drug.trim(), presentation: m.presentation.trim() || undefined, dose: m.dose.trim(),
            frequency: m.frequency.trim() || undefined, startDate: desde, endDate: hasta, indication: m.indication.trim() || undefined, updatedAt: ahoraISO(),
          }, 'medicacion.crear');
          setM({ drug: '', presentation: '', dose: '', frequency: '', desde: aCampos(ahoraISO()).fecha, hasta: '', indication: '' });
          setError(undefined);
          return true;
        }}
      >
        <Campo etiqueta="Fármaco" value={m.drug} onChangeText={poner('drug')} />
        <Campo etiqueta="Presentación (opcional)" value={m.presentation} onChangeText={poner('presentation')} placeholder="Jarabe, comprimidos…" />
        <Campo etiqueta="Dosis" value={m.dose} onChangeText={poner('dose')} ayuda="La escribís vos, tal como la indicás." />
        <Campo etiqueta="Frecuencia (opcional)" value={m.frequency} onChangeText={poner('frequency')} />
        <View style={s.fila}>
          <View style={s.mitad}><CampoFecha etiqueta="Desde" value={m.desde} onChangeText={poner('desde')} /></View>
          <View style={s.mitad}><CampoFecha opcional etiqueta="Hasta (opcional)" value={m.hasta} onChangeText={poner('hasta')} /></View>
        </View>
        <Campo etiqueta="Indicación (opcional)" value={m.indication} onChangeText={poner('indication')} />
        {error ? <TextoChico color={colors.alert}>{error}</TextoChico> : null}
      </Agregar>
    </Seccion>
  );
}

export function BloquePrescripciones({ paciente: p }: { paciente: Patient }) {
  const { db, agregar, actualizar } = useApp();
  const lista = prescripcionesDe(db, p.id);
  const consultas = consultasDe(db, p.id).slice(0, 5);
  const plataforma = db.links.recetasNombre || 'tu plataforma de recetas';
  const [fecha, setFecha] = useState(aCampos(ahoraISO()).fecha);
  const [detalle, setDetalle] = useState('');
  const [consulta, setConsulta] = useState<string>('ninguna');
  const [error, setError] = useState<string>();

  return (
    <Seccion titulo="Prescripciones" bajada="Registro de lo indicado. La receta legal se emite en tu plataforma registrada">
      <Boton
        titulo={`Emitir receta en ${plataforma}`}
        icono="open-outline"
        variante="secundario"
        deshabilitado={!db.links.recetasUrl}
        detalle={db.links.recetasUrl ? undefined : 'Falta cargar el link de tu plataforma de recetas en Configuración › Links.'}
        onPress={() => { void Linking.openURL(db.links.recetasUrl); }}
      />
      {lista.length === 0 ? <Texto color={colors.textMuted}>Sin prescripciones registradas.</Texto> : null}
      {lista.map((x) => {
        const c = x.consultationId ? db.consultations.find((k) => k.id === x.consultationId) : undefined;
        return (
          <Tarjeta key={x.id} style={{ gap: 6 }}>
            <View style={s.fila}>
              <TextoFuerte style={{ flex: 1 }}>{fechaCorta(x.date)}</TextoFuerte>
              <Etiqueta texto={x.issuedAt ? 'Receta emitida' : 'Sin emitir'} tono={x.issuedAt ? 'verde' : 'neutro'} />
            </View>
            <Texto>{x.detail}</Texto>
            <ListaAdjuntos documentos={db.documents.filter((d) => d.prescriptionId === x.id && !d.archivedAt)} />
            <BotonAdjuntar
              titulo="Adjuntar el PDF de la receta"
              datos={{ patientId: p.id, title: `Receta del ${fechaCorta(x.date)}`, date: x.date, kind: 'receta', visibleToFamily: false, prescriptionId: x.id }}
            />
            <View style={s.acciones}>
              {c ? <BotonTexto texto={`Consulta del ${fechaCorta(c.occurredAt)}`} onPress={() => router.push(`/medico/consulta/${c.id}`)} /> : null}
              {x.issuedAt
                ? <BotonTexto texto="Marcar sin emitir" onPress={() => actualizar('prescriptions', x.id, { issuedAt: undefined }, 'prescripcion.sin-emitir')} />
                : <BotonTexto texto="Ya la emití en la plataforma" onPress={() => actualizar('prescriptions', x.id, { issuedAt: ahoraISO() }, 'prescripcion.emitida')} />}
            </View>
          </Tarjeta>
        );
      })}
      <Agregar
        titulo="Registrar lo indicado"
        alCancelar={() => { setDetalle(''); setConsulta('ninguna'); setError(undefined); }}
        guardar={() => {
          const f = deFecha(fecha);
          if (!f) { setError('Revisá la fecha.'); return false; }
          if (!detalle.trim()) { setError('Escribí lo que indicaste.'); return false; }
          agregar('prescriptions', { patientId: p.id, date: f, detail: detalle.trim(), consultationId: consulta === 'ninguna' ? undefined : consulta }, 'prescripcion.crear');
          setDetalle(''); setConsulta('ninguna'); setError(undefined);
          return true;
        }}
      >
        <CampoFecha etiqueta="Fecha" value={fecha} onChangeText={setFecha} />
        <Campo etiqueta="Lo indicado" value={detalle} onChangeText={setDetalle} multiline ayuda="Tal como lo indicaste. No se calcula nada." />
        {consultas.length > 0 ? (
          <Opciones
            etiqueta="Consulta (opcional)"
            columna
            opciones={[{ valor: 'ninguna', texto: 'Sin consulta' }, ...consultas.map((c) => ({ valor: c.id, texto: fechaCorta(c.occurredAt), detalle: TEXTO_VISITA[c.visitType] }))]}
            valor={consulta}
            onCambio={setConsulta}
          />
        ) : null}
        {error ? <TextoChico color={colors.alert}>{error}</TextoChico> : null}
      </Agregar>
    </Seccion>
  );
}

const s = StyleSheet.create({
  fila: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  mitad: { flex: 1, minWidth: 140 },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 4 },
});
