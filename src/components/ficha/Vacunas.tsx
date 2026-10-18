/**
 * Vacunas del paciente (prompt maestro 7.8): el esquema según el calendario, agrupado por edad,
 * con el estado de cada dosis (aplicada, atrasada o pendiente), y las vacunas no obligatorias
 * cargadas a mano. Mientras el calendario no esté verificado se ve el aviso.
 */
import { CampoFecha } from '@/components/CampoFecha';
import { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { estadoDosis, resumenVacunas } from '@shared/vacunas';
import { useApp } from '@/data/store';
import type { Patient, VaccineDose } from '@/data/types';
import { dosisDelEsquema } from '@/data/vacunasApp';
import { aCampos, ahoraISO, deFecha, fechaCorta, hoyISO } from '@/lib/fechas';
import { Seccion } from '../Seccion';
import { Tarjeta } from '../Tarjeta';
import { Etiqueta } from '../Etiqueta';
import { Boton } from '../Boton';
import { Campo, Aviso } from '../Formulario';
import { Texto, TextoFuerte, TextoChico } from '../Texto';
import { Agregar, BotonTexto } from './piezas';
import { categorias, colors } from '@/theme';

export const AVISO_CALENDARIO = 'Calendario sin verificar: es un borrador. Las fechas son estimadas y no salen recordatorios a la familia hasta que lo verifiques.';

export function BloqueVacunas({ paciente: p }: { paciente: Patient }) {
  const { db, enLote, agregar } = useApp();
  const hoy = hoyISO();
  const dosis = db.vaccineDoses.filter((d) => d.patientId === p.id && !d.archivedAt);
  const delCalendario = dosis.filter((d) => d.source === 'calendario').sort((a, b) => (a.ageMonths ?? 0) - (b.ageMonths ?? 0));
  const manuales = dosis.filter((d) => d.source === 'manual').sort((a, b) => (b.appliedDate ?? '').localeCompare(a.appliedDate ?? ''));
  const r = resumenVacunas(delCalendario, hoy);
  const grupos = delCalendario.reduce<{ edad: string; dosis: VaccineDose[] }[]>((acc, d) => {
    const ultimo = acc.at(-1);
    if (ultimo && ultimo.edad === d.ageText) ultimo.dosis.push(d);
    else acc.push({ edad: d.ageText ?? '', dosis: [d] });
    return acc;
  }, []);

  const generar = () => enLote((d, { ahora, usuarioId, log }) => {
    if (d.vaccineDoses.some((x) => x.patientId === p.id && x.source === 'calendario')) return d;
    log({ action: 'vacunas.generar-esquema', entity: 'vaccineDoses', detail: p.id });
    return { ...d, vaccineDoses: [...d.vaccineDoses, ...dosisDelEsquema(p.id, p.birthDate, ahora, usuarioId)] };
  });

  // Vacuna no obligatoria
  const [vacuna, setVacuna] = useState('');
  const [detalle, setDetalle] = useState('');
  const [fecha, setFecha] = useState(aCampos(ahoraISO()).fecha);
  const [lugar, setLugar] = useState('');
  const [lote, setLote] = useState('');
  const [error, setError] = useState<string>();

  return (
    <>
      <Seccion titulo="Vacunas" bajada="Esquema según el calendario">
        {!db.vacunas.calendarioVerificado ? <Aviso icono="alert-circle-outline" texto={AVISO_CALENDARIO} /> : null}
        {delCalendario.length === 0 ? (
          <Tarjeta style={{ gap: 10 }}>
            <Texto>Este paciente todavía no tiene el esquema armado.</Texto>
            <Boton titulo="Generar esquema según el calendario" icono="shield-checkmark-outline" onPress={generar} />
            <TextoChico>Arma una dosis por cada vacuna del calendario, con la fecha estimada según la fecha de nacimiento. Después marcás las que ya están aplicadas.</TextoChico>
          </Tarjeta>
        ) : (
          <>
            <Tarjeta style={s.resumen}>
              <Ionicons name={r.alDia ? 'checkmark-circle' : 'warning'} size={24} color={r.alDia ? categorias.verde.acento : colors.alert} />
              <TextoFuerte style={{ flex: 1 }} color={r.alDia ? categorias.verde.texto : colors.alert}>
                {r.alDia ? 'Calendario al día' : `${r.atrasadas.length} ${r.atrasadas.length === 1 ? 'dosis atrasada' : 'dosis atrasadas'}`}
              </TextoFuerte>
              {r.proxima ? <TextoChico>Próxima: {r.proxima.vaccine} · {fechaCorta(r.proxima.dueDate!)}</TextoChico> : null}
            </Tarjeta>
            {grupos.map((g) => (
              <View key={g.edad} style={{ gap: 6 }}>
                <TextoFuerte color={colors.primary2}>{g.edad}</TextoFuerte>
                <Tarjeta style={{ gap: 0, paddingVertical: 4 }}>
                  {g.dosis.map((d, n) => <FilaDosis key={d.id} dosis={d} hoy={hoy} primera={n === 0} />)}
                </Tarjeta>
              </View>
            ))}
          </>
        )}
      </Seccion>

      <Seccion titulo="Otras vacunas" bajada="No obligatorias (antigripal, otras), cargadas a mano">
        {manuales.length === 0 ? <Texto color={colors.textMuted}>Sin vacunas cargadas a mano.</Texto> : (
          <Tarjeta style={{ gap: 0, paddingVertical: 4 }}>
            {manuales.map((d, n) => <FilaDosis key={d.id} dosis={d} hoy={hoy} primera={n === 0} />)}
          </Tarjeta>
        )}
        <Agregar
          titulo="Agregar vacuna"
          alCancelar={() => { setVacuna(''); setDetalle(''); setLugar(''); setLote(''); setError(undefined); }}
          guardar={() => {
            const f = deFecha(fecha);
            if (!vacuna.trim()) { setError('Escribí la vacuna.'); return false; }
            if (!f || f > hoy) { setError('Revisá la fecha de aplicación (no puede ser futura).'); return false; }
            agregar('vaccineDoses', {
              patientId: p.id, vaccine: vacuna.trim(), dose: detalle.trim(), status: 'aplicada', appliedDate: f,
              place: lugar.trim() || undefined, lot: lote.trim() || undefined, source: 'manual', updatedAt: ahoraISO(),
            }, 'vacuna.cargar');
            setVacuna(''); setDetalle(''); setLugar(''); setLote(''); setError(undefined);
            return true;
          }}
        >
          <Campo etiqueta="Vacuna" value={vacuna} onChangeText={setVacuna} placeholder="Antigripal" />
          <Campo etiqueta="Dosis o detalle (opcional)" value={detalle} onChangeText={setDetalle} placeholder="2026" />
          <CampoFecha etiqueta="Fecha de aplicación" value={fecha} onChangeText={setFecha} maximo={hoyISO()} />
          <Campo etiqueta="Lugar (opcional)" value={lugar} onChangeText={setLugar} />
          <Campo etiqueta="Lote (opcional)" value={lote} onChangeText={setLote} />
          {error ? <TextoChico color={colors.alert}>{error}</TextoChico> : null}
        </Agregar>
      </Seccion>
    </>
  );
}

function FilaDosis({ dosis: d, hoy, primera }: { dosis: VaccineDose; hoy: string; primera: boolean }) {
  const { actualizar } = useApp();
  const estado = estadoDosis(d, hoy);
  const [abierta, setAbierta] = useState(false);
  const [fecha, setFecha] = useState(aCampos(d.appliedDate ? `${d.appliedDate}T12:00` : ahoraISO()).fecha);
  const [lugar, setLugar] = useState(d.place ?? '');
  const [lote, setLote] = useState(d.lot ?? '');
  const [error, setError] = useState<string>();

  const guardar = () => {
    const f = deFecha(fecha);
    if (!f || f > hoy) return setError('Revisá la fecha de aplicación (no puede ser futura).');
    actualizar('vaccineDoses', d.id, { status: 'aplicada', appliedDate: f, place: lugar.trim() || undefined, lot: lote.trim() || undefined, updatedAt: ahoraISO() }, 'vacuna.aplicar');
    setAbierta(false);
    setError(undefined);
  };

  return (
    <View style={[s.dosis, !primera && s.separador]}>
      <Pressable onPress={() => setAbierta((x) => !x)} accessibilityRole="button" accessibilityState={{ expanded: abierta }} style={s.filaDosis}>
        <Ionicons
          name={estado === 'aplicada' ? 'shield-checkmark' : estado === 'atrasada' ? 'alert-circle' : 'ellipse-outline'}
          size={22}
          color={estado === 'aplicada' ? categorias.rosado.acento : estado === 'atrasada' ? colors.alert : colors.primary3}
        />
        <View style={{ flex: 1 }}>
          <TextoFuerte>{d.vaccine}{d.dose ? ` · ${d.dose}` : ''}</TextoFuerte>
          <TextoChico>
            {estado === 'aplicada'
              ? `Aplicada el ${fechaCorta(d.appliedDate!)}${d.place ? ` · ${d.place}` : ''}${d.lot ? ` · lote ${d.lot}` : ''}`
              : d.dueDate ? `Fecha estimada ${fechaCorta(d.dueDate)}` : 'Sin fecha estimada'}
          </TextoChico>
        </View>
        {estado === 'atrasada' ? <Etiqueta texto="Atrasada" tono="alerta" /> : null}
        {estado === 'pendiente' ? <Etiqueta texto="Pendiente" tono="neutro" /> : null}
      </Pressable>
      {abierta ? (
        <View style={s.form}>
          <CampoFecha etiqueta="Fecha de aplicación" value={fecha} onChangeText={setFecha} maximo={hoyISO()} />
          <Campo etiqueta="Lugar (opcional)" value={lugar} onChangeText={setLugar} />
          <Campo etiqueta="Lote (opcional)" value={lote} onChangeText={setLote} />
          {error ? <TextoChico color={colors.alert}>{error}</TextoChico> : null}
          <Boton titulo={estado === 'aplicada' ? 'Guardar cambios' : 'Marcar aplicada'} compacto onPress={guardar} />
          {estado === 'aplicada' && d.source === 'calendario' ? (
            <BotonTexto texto="Quitar la aplicación (vuelve a pendiente)" onPress={() => {
              actualizar('vaccineDoses', d.id, { status: 'pendiente', appliedDate: undefined, place: undefined, lot: undefined, updatedAt: ahoraISO() }, 'vacuna.quitar-aplicacion');
              setAbierta(false);
            }} />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  resumen: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  dosis: { paddingVertical: 8 },
  separador: { borderTopWidth: 1, borderTopColor: colors.border },
  filaDosis: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  form: { gap: 10, paddingTop: 10, paddingLeft: 32 },
});
