/**
 * Ficha de un hijo en el portal de la familia (la del médico es components/ficha/FichaPaciente.tsx).
 * Los datos ya llegan filtrados por la vista de familia (data/vistaFamilia.ts):
 * acá no hay nada oculto que esconder.
 *
 * Secciones (tarjetas en grilla; en el teléfono, una debajo de otra): Informes de las visitas,
 * Plan vigente, Vacunas, Alergias y temas de salud, Crecimiento, Registro de fiebre y Certificados.
 * Documentos y materiales no se bajan desde el portal (decisión del Dr., 17/10/2026).
 */
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/data/store';
import { paciente, nombreCompleto, alergiasDe, problemasDe, informesFamilia, TEXTO_VISITA } from '@/data/selectores';
import type { CarePlanCategory } from '@/data/types';
import { edades } from '@/lib/edad';
import { fechaLarga, fechaCorta, hoyISO } from '@/lib/fechas';
import { categorias, colors, fonts, size } from '@/theme';
import { Titulo, Texto, TextoFuerte, TextoChico } from './Texto';
import { Caja, Grilla } from './Caja';
import { Etiqueta } from './Etiqueta';
import { Boton } from './Boton';
import { AlergiasDestacadas } from './Alergias';
import { TarjetaCrecimiento } from './crecimiento/TarjetaCrecimiento';
import { ListaCertificados } from './certificados/ListaCertificados';

const CATEGORIA: Record<CarePlanCategory, string> = { control: 'Control', prevencion: 'Prevención', vacuna: 'Vacuna', estudio: 'Estudio', otro: 'Otro' };

export function FichaHijo({ hijoId, conEncabezado = true }: { hijoId: string; conEncabezado?: boolean }) {
  const { db } = useApp();
  const p = paciente(db, hijoId);
  if (!p) return <Texto>No encontramos esta ficha.</Texto>;
  const e = edades(p);

  return (
    <>
      {conEncabezado ? (
        <View style={{ gap: 6 }}>
          <Titulo>{nombreCompleto(p)}</Titulo>
          <Texto style={s.edad}>{e.cronologica}</Texto>
          {e.corregida ? (
            <View style={s.corregida}>
              <Ionicons name="time-outline" size={20} color={colors.primary} />
              <Texto style={{ flex: 1 }}><TextoFuerte color={colors.primary}>Edad corregida: </TextoFuerte>{e.corregida}</Texto>
            </View>
          ) : null}
          <TextoChico>Nació el {fechaLarga(p.birthDate)}</TextoChico>
        </View>
      ) : null}

      <Grilla>
        <Informes patientId={p.id} />
        <PlanVigente patientId={p.id} />
        <AlergiasYTemas patientId={p.id} />

        <Caja titulo="Crecimiento" icono="trending-up-outline" color="celeste" ancha>
          <TarjetaCrecimiento paciente={p} vista="familia" />
        </Caja>

        <Caja titulo="Registro de fiebre" icono="thermometer-outline" color="naranja">
          <Texto>Anotá temperaturas y antitérmicos.</Texto>
          <Boton titulo="Abrir el registro de fiebre" icono="thermometer-outline" variante="secundario" onPress={() => router.push(`/familia/fiebre/${p.id}`)} />
        </Caja>

        <Certificados patientId={p.id} />
      </Grilla>
    </>
  );
}

function Informes({ patientId }: { patientId: string }) {
  const { db } = useApp();
  const informes = informesFamilia(db, patientId);
  return (
    <Caja titulo="Informes de las visitas" icono="document-text-outline" color="celeste">
      {informes.length === 0 ? <Texto color={colors.textMuted}>Todavía no hay informes.</Texto> : null}
      {informes.map((i, n) => (
        <View key={i.consulta.id} style={[{ gap: 8 }, n > 0 && s.separador]}>
          <View style={s.filaEntre}>
            <TextoFuerte>{fechaLarga(i.consulta.occurredAt)}</TextoFuerte>
            <Etiqueta texto={TEXTO_VISITA[i.consulta.visitType]} tono="celeste" />
          </View>
          <Texto>{i.resumen}</Texto>
          {i.version > 1 ? <TextoChico>Corregido el {fechaCorta(i.aprobadaEn)}</TextoChico> : null}
        </View>
      ))}
    </Caja>
  );
}

function PlanVigente({ patientId }: { patientId: string }) {
  const { db } = useApp();
  const pendientes = db.carePlan
    .filter((i) => i.patientId === patientId && !i.done && !i.cancelledAt)
    .sort((a, b) => (a.targetDate ?? '9').localeCompare(b.targetDate ?? '9'));
  const vacunas = db.vaccineDoses
    .filter((d) => d.patientId === patientId && d.status === 'aplicada' && d.appliedDate)
    .sort((a, b) => b.appliedDate!.localeCompare(a.appliedDate!));
  // Las próximas dosis salen del calendario: se muestran solo cuando el Dr. lo verificó.
  const proximas = db.vacunas.calendarioVerificado
    ? db.vaccineDoses.filter((d) => d.patientId === patientId && d.status === 'pendiente' && d.dueDate && d.dueDate >= hoyISO())
      .sort((a, b) => a.dueDate!.localeCompare(b.dueDate!)).slice(0, 3)
    : [];
  return (
    <>
      <Caja titulo="Plan vigente" icono="list-outline" color="rosado">
        {pendientes.length === 0 ? <Texto color={colors.textMuted}>No hay nada pendiente.</Texto> : (
          <View style={{ gap: 12 }}>
            {pendientes.map((i, n) => (
              <View key={i.id} style={[s.fila, n > 0 && s.separador]}>
                <Ionicons name="ellipse-outline" size={22} color={categorias.rosado.acento} />
                <View style={{ flex: 1 }}>
                  <TextoFuerte>{i.description}</TextoFuerte>
                  <TextoChico>{CATEGORIA[i.category]}{i.targetDate ? ` · ${fechaCorta(i.targetDate)}` : ''}</TextoChico>
                </View>
              </View>
            ))}
          </View>
        )}
      </Caja>
      {vacunas.length + proximas.length > 0 ? (
        <Caja titulo="Vacunas" icono="shield-checkmark-outline" color="rosado">
          <View style={{ gap: 12 }}>
            {vacunas.map((v, n) => (
              <View key={v.id} style={[s.fila, n > 0 && s.separador]}>
                <Ionicons name="shield-checkmark" size={22} color={categorias.rosado.acento} />
                <TextoFuerte style={{ flex: 1 }}>{v.vaccine}{v.dose ? ` · ${v.dose}` : ''}</TextoFuerte>
                <TextoChico>{fechaCorta(v.appliedDate!)}</TextoChico>
              </View>
            ))}
            {proximas.map((v) => (
              <View key={v.id} style={[s.fila, s.separador]}>
                <Ionicons name="calendar-outline" size={22} color={categorias.rosado.acento} />
                <Texto style={{ flex: 1 }}>Próxima: {v.vaccine}{v.dose ? ` · ${v.dose}` : ''}</Texto>
                <TextoChico>{fechaCorta(v.dueDate!)}</TextoChico>
              </View>
            ))}
          </View>
        </Caja>
      ) : null}
    </>
  );
}

function AlergiasYTemas({ patientId }: { patientId: string }) {
  const { db } = useApp();
  const problemas = problemasDe(db, patientId, 'familia');
  return (
    <Caja titulo="Alergias y temas de salud" icono="medkit-outline" color="celeste">
      <AlergiasDestacadas alergias={alergiasDe(db, patientId, 'familia')} />
      {problemas.length > 0 ? (
        <View style={[{ gap: 14 }, s.separador]}>
          {problemas.map((pr, i) => (
            <View key={pr.id} style={[s.fila, i > 0 && s.separador]}>
              <View style={{ flex: 1, gap: 4 }}>
                <TextoFuerte>{pr.description}</TextoFuerte>
                {pr.since ? <TextoChico>Desde {fechaCorta(pr.since)}</TextoChico> : null}
              </View>
              <Etiqueta texto={pr.status === 'activo' ? 'En seguimiento' : 'Resuelto'} tono={pr.status === 'activo' ? 'celeste' : 'neutro'} />
            </View>
          ))}
        </View>
      ) : null}
    </Caja>
  );
}

function Certificados({ patientId }: { patientId: string }) {
  return (
    <Caja titulo="Certificados" icono="document-attach-outline" color="celeste">
      <ListaCertificados patientId={patientId} vista="familia" />
    </Caja>
  );
}

const s = StyleSheet.create({
  edad: { fontFamily: fonts.bodySemi, fontSize: size.large, color: colors.primary2 },
  corregida: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.bgSoft, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  filaEntre: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
  separador: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
});
