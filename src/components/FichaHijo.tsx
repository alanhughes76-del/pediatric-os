/**
 * Ficha del paciente. La misma pantalla sirve para la familia y para el médico:
 * qué se muestra lo deciden los selectores según la vista.
 * (La ficha completa del médico —contacto, adultos, edición de problemas, alergias,
 * alta de ítems del plan y certificados— llega en la próxima entrega.)
 */
import { View, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/data/store';
import {
  paciente, nombreCompleto, alergiasDe, problemasDe, consultasDe, informesFamilia,
  notaVigente, fiebreDe, sinRevisar, TEXTO_VISITA, type Vista,
} from '@/data/selectores';
import type { CarePlanCategory } from '@/data/types';
import { edades, textoEG } from '@/lib/edad';
import { ahoraISO, fechaLarga, fechaCorta, hora } from '@/lib/fechas';
import { colors, fonts, size } from '@/theme';
import { Titulo, Texto, TextoFuerte, TextoChico } from './Texto';
import { Tarjeta } from './Tarjeta';
import { Seccion } from './Seccion';
import { Etiqueta } from './Etiqueta';
import { Boton } from './Boton';
import { AlergiasDestacadas } from './Alergias';
import { TarjetaCrecimiento } from './crecimiento/TarjetaCrecimiento';

const CATEGORIA: Record<CarePlanCategory, string> = { control: 'Control', prevencion: 'Prevención', vacuna: 'Vacuna', otro: 'Otro' };
const SEXO = { M: 'Masculino', F: 'Femenino', X: 'X' } as const;

export function FichaHijo({ hijoId, vista }: { hijoId: string; vista: Vista }) {
  const { db, agregar } = useApp();
  const p = paciente(db, hijoId);
  if (!p) return <Texto>No encontramos esta ficha.</Texto>;

  const esMedico = vista === 'medico';
  const e = edades(p);
  const fiebre = fiebreDe(db, p.id);
  const fiebreSinRevisar = fiebre.filter(sinRevisar).length;

  const nuevaConsulta = () => {
    const id = agregar('consultations', {
      patientId: p.id, occurredAt: ahoraISO(), modality: 'domicilio', visitType: 'control', status: 'realizada', rawText: '',
    }, 'consulta.crear');
    router.push(`/medico/consulta/${id}`);
  };

  return (
    <>
      {/* Edad actual y edad gestacional al nacer */}
      <View style={{ gap: 6 }}>
        <Titulo>{nombreCompleto(p)}</Titulo>
        <Texto style={s.edad}>{e.cronologica}</Texto>
        {e.corregida ? (
          <View style={s.corregida}>
            <Ionicons name="time-outline" size={20} color={colors.primary} />
            <Texto style={{ flex: 1 }}>
              <TextoFuerte color={colors.primary}>Edad corregida: </TextoFuerte>
              {e.corregida}
            </Texto>
          </View>
        ) : null}
      </View>

      <Tarjeta style={{ gap: 10 }}>
        <Dato etiqueta="Fecha de nacimiento" valor={fechaLarga(p.birthDate)} />
        <Dato etiqueta="Edad gestacional al nacer" valor={textoEG(p)} />
        <Dato etiqueta="Sexo" valor={SEXO[p.sex]} />
      </Tarjeta>

      <AlergiasDestacadas alergias={alergiasDe(db, p.id, vista)} />

      {esMedico ? (
        <View style={{ gap: 10 }}>
          <Boton titulo="Nueva consulta" icono="add-circle-outline" onPress={nuevaConsulta} />
          <Boton
            titulo="Registro de fiebre"
            detalle={fiebre.length ? `${fiebre.length} registros · ${fiebreSinRevisar} sin revisar` : 'Sin registros'}
            icono="thermometer-outline"
            variante="contorno"
            onPress={() => router.push(`/medico/fiebre/${p.id}`)}
          />
        </View>
      ) : (
        <Boton titulo="Registro de fiebre" icono="thermometer-outline" variante="secundario" onPress={() => router.push(`/familia/fiebre/${p.id}`)} />
      )}

      {esMedico ? <ConsultasMedico patientId={p.id} /> : <InformesFamilia patientId={p.id} />}

      <PlanDeCuidado patientId={p.id} vista={vista} />
      <VacunasAplicadas patientId={p.id} />

      <ProblemasYAlergias patientId={p.id} vista={vista} />

      <Seccion titulo="Crecimiento">
        <Tarjeta>
          <TarjetaCrecimiento paciente={p} vista={vista} />
        </Tarjeta>
      </Seccion>
    </>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View style={{ gap: 2 }}>
      <TextoChico>{etiqueta}</TextoChico>
      <Texto style={{ fontFamily: fonts.bodySemi }}>{valor}</Texto>
    </View>
  );
}

/**
 * Plan de cuidado. El médico tilda cada ítem como hecho o lo reabre.
 * La familia ve solo los pendientes ("Plan vigente").
 */
function PlanDeCuidado({ patientId, vista }: { patientId: string; vista: Vista }) {
  const { db, actualizar } = useApp();
  const esMedico = vista === 'medico';
  const plan = db.carePlan
    .filter((i) => i.patientId === patientId && !i.archivedAt && (esMedico || !i.done))
    .sort((a, b) => Number(a.done) - Number(b.done) || (a.targetDate ?? '9').localeCompare(b.targetDate ?? '9'));
  if (plan.length === 0) return null;

  return (
    <Seccion titulo={esMedico ? 'Plan de cuidado' : 'Plan vigente'} bajada={esMedico ? 'Tocá un ítem para tildarlo como hecho o reabrirlo' : undefined}>
      <Tarjeta style={{ gap: 12 }}>
        {plan.map((i, n) => {
          const contenido = (
            <>
              <Ionicons name={i.done ? 'checkbox' : 'square-outline'} size={26} color={i.done ? colors.primary3 : colors.primary2} />
              <View style={{ flex: 1 }}>
                <TextoFuerte style={i.done ? { color: colors.textMuted } : undefined}>{i.description}</TextoFuerte>
                <TextoChico>
                  {CATEGORIA[i.category]}
                  {i.targetDate ? ` · ${fechaCorta(i.targetDate)}` : ''}
                  {i.done && i.doneAt ? ` · ${i.category === 'vacuna' ? 'Aplicada' : 'Hecho'} el ${fechaCorta(i.doneAt)}` : ''}
                </TextoChico>
              </View>
            </>
          );
          return esMedico ? (
            <Pressable
              key={i.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: i.done }}
              onPress={() => actualizar('carePlan', i.id, i.done ? { done: false, doneAt: undefined } : { done: true, doneAt: ahoraISO() }, i.done ? 'plan.reabrir' : 'plan.hecho')}
              style={[s.fila, n > 0 && s.separador, { minHeight: 48 }]}
            >
              {contenido}
            </Pressable>
          ) : (
            <View key={i.id} style={[s.fila, n > 0 && s.separador]}>{contenido}</View>
          );
        })}
      </Tarjeta>
    </Seccion>
  );
}

/** Vacunas del plan de cuidado ya tildadas: quedan como aplicadas (las ven el médico y la familia). */
function VacunasAplicadas({ patientId }: { patientId: string }) {
  const { db } = useApp();
  const vacunas = db.carePlan
    .filter((i) => i.patientId === patientId && !i.archivedAt && i.category === 'vacuna' && i.done)
    .sort((a, b) => (b.doneAt ?? '').localeCompare(a.doneAt ?? ''));
  if (vacunas.length === 0) return null;

  return (
    <Seccion titulo="Vacunas aplicadas">
      <Tarjeta style={{ gap: 12 }}>
        {vacunas.map((v, n) => (
          <View key={v.id} style={[s.fila, n > 0 && s.separador]}>
            <Ionicons name="shield-checkmark" size={22} color={colors.primary3} />
            <TextoFuerte style={{ flex: 1 }}>{v.description}</TextoFuerte>
            {v.doneAt ? <TextoChico>{fechaCorta(v.doneAt)}</TextoChico> : null}
          </View>
        ))}
      </Tarjeta>
    </Seccion>
  );
}

function ProblemasYAlergias({ patientId, vista }: { patientId: string; vista: Vista }) {
  const { db } = useApp();
  const problemas = problemasDe(db, patientId, vista);
  if (problemas.length === 0) return null;
  const esMedico = vista === 'medico';
  return (
    <Seccion titulo={esMedico ? 'Problemas de salud' : 'Temas de salud'}>
      <Tarjeta style={{ gap: 14 }}>
        {problemas.map((pr, i) => (
          <View key={pr.id} style={[s.fila, i > 0 && s.separador]}>
            <View style={{ flex: 1, gap: 4 }}>
              <TextoFuerte>{pr.description}</TextoFuerte>
              {pr.since ? <TextoChico>Desde {fechaCorta(pr.since)}</TextoChico> : null}
            </View>
            <View style={{ gap: 4, alignItems: 'flex-end' }}>
              <Etiqueta texto={pr.status === 'activo' ? 'En seguimiento' : 'Resuelto'} tono={pr.status === 'activo' ? 'celeste' : 'neutro'} />
              {esMedico ? <Etiqueta texto={pr.visibleToFamily ? 'Lo ve la familia' : 'Oculto'} tono={pr.visibleToFamily ? 'azul' : 'neutro'} /> : null}
            </View>
          </View>
        ))}
      </Tarjeta>
    </Seccion>
  );
}

function ConsultasMedico({ patientId }: { patientId: string }) {
  const { db } = useApp();
  const consultas = consultasDe(db, patientId);
  return (
    <Seccion titulo="Consultas">
      {consultas.length === 0 ? <Texto color={colors.textMuted}>Todavía no hay consultas.</Texto> : null}
      {consultas.map((c) => {
        const nota = notaVigente(db, c.id);
        return (
          <Tarjeta key={c.id} onPress={() => router.push(`/medico/consulta/${c.id}`)} accessibilityLabel={`Abrir la consulta del ${fechaCorta(c.occurredAt)}`}>
            <View style={s.fila}>
              <View style={{ flex: 1, gap: 6 }}>
                <TextoFuerte>{fechaCorta(c.occurredAt)} {hora(c.occurredAt)} · {TEXTO_VISITA[c.visitType]}</TextoFuerte>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  <Etiqueta
                    texto={!nota ? 'Sin nota' : nota.status === 'aprobada' ? `Nota aprobada · v${nota.version}` : `Nota en borrador · v${nota.version}`}
                    tono={nota?.status === 'aprobada' ? 'celeste' : 'neutro'}
                  />
                  {nota?.clinicalFlag ? <Etiqueta texto="Bandera" tono="alerta" /> : null}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={24} color={colors.primary3} />
            </View>
          </Tarjeta>
        );
      })}
    </Seccion>
  );
}

function InformesFamilia({ patientId }: { patientId: string }) {
  const { db } = useApp();
  const informes = informesFamilia(db, patientId);
  return (
    <Seccion titulo="Informes de las visitas">
      {informes.length === 0 ? <Texto color={colors.textMuted}>Todavía no hay informes.</Texto> : null}
      {informes.map((i) => (
        <Tarjeta key={i.consulta.id} style={{ gap: 8 }}>
          <View style={s.filaEntre}>
            <TextoFuerte>{fechaLarga(i.consulta.occurredAt)}</TextoFuerte>
            <Etiqueta texto={TEXTO_VISITA[i.consulta.visitType]} tono="celeste" />
          </View>
          <Texto>{i.resumen}</Texto>
          {i.version > 1 ? <TextoChico>Corregido el {fechaCorta(i.aprobadaEn)}</TextoChico> : null}
        </Tarjeta>
      ))}
    </Seccion>
  );
}

const s = StyleSheet.create({
  edad: { fontFamily: fonts.bodySemi, fontSize: size.large, color: colors.primary2 },
  corregida: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.bgSoft, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  filaEntre: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
  separador: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
});
