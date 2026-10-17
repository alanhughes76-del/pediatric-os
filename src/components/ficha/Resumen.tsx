/**
 * Solapa "Resumen" de la ficha del médico: tarjetas de solo lectura que resumen cada parte
 * de la ficha, con un enlace a su solapa, y el plan de cuidado ordenado por plazo.
 * En pantalla ancha las tarjetas van en grilla; en el teléfono, una debajo de otra.
 */
import type { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/data/store';
import { alergiasDe, consultasDe, fiebreDe, medicionesDe, notaVigente, problemasDe, seguimientosPendientes, sinRevisar, TEXTO_MODALIDAD, TEXTO_VISITA } from '@/data/selectores';
import type { CarePlanCategory, CarePlanItem, Patient } from '@/data/types';
import { filasDeCrecimiento, type Medida } from '@/lib/crecimiento';
import { formatoPercentil } from '@/lib/percentiles';
import { textoEG } from '@/lib/edad';
import { ahoraISO, fechaCorta, fechaLarga, hoyISO } from '@/lib/fechas';
import { tipoCertificado } from '@/lib/certificados';
import { PLAZOS, planPorPlazo, type Plazo } from '@/lib/planPorPlazo';
import { Tarjeta } from '../Tarjeta';
import { Caja, Grilla } from '../Caja';
import { Etiqueta } from '../Etiqueta';
import { Texto, TextoFuerte, TextoChico } from '../Texto';
import { categorias, colors, fonts, type Categoria } from '@/theme';
import type { SolapaFicha } from './FichaPaciente';

type NombreIcono = keyof typeof Ionicons.glyphMap;

const COLOR_CATEGORIA: Record<CarePlanCategory, Categoria> = { control: 'celeste', vacuna: 'rosado', prevencion: 'naranja', otro: 'celeste' };
const COLOR_PLAZO: Record<Plazo, Categoria> = { hoy: 'celeste', treinta: 'verde', meses: 'violeta', prevencion: 'naranja' };
const ICONO_PLAZO: Record<Plazo, NombreIcono> = { hoy: 'today-outline', treinta: 'time-outline', meses: 'calendar-outline', prevencion: 'shield-outline' };

export function Resumen({ paciente: p, irA }: { paciente: Patient; irA: (s: SolapaFicha) => void }) {
  return (
    <>
      <Grilla>
        <ResumenClinico paciente={p} irA={irA} />
        <UltimaConsulta paciente={p} irA={irA} />
        <ProximasAcciones paciente={p} irA={irA} />
        <Crecimiento paciente={p} irA={irA} />
        <Vacunas paciente={p} irA={irA} />
        <Pendiente titulo="Estudios" icono="flask-outline" etapa="Etapa 5" texto="Pedidos y resultados para revisar." onPress={() => irA('estudios')} />
        <Pendiente titulo="Prescripciones activas" icono="reader-outline" etapa="Etapa 5" texto="Lo indicado en cada consulta." onPress={() => irA('medicaciones')} />
        <Documentos paciente={p} irA={irA} />
        <Pendiente titulo="Comunicaciones recientes" icono="chatbubbles-outline" etapa="Etapa 7" texto="Recordatorios, resúmenes y avisos enviados." onPress={() => irA('comunicaciones')} />
        <PlanPorPlazo paciente={p} irA={irA} />
        <Pendiente titulo="IA Asistente" icono="sparkles-outline" color="violeta" etapa="Etapa 9" texto="Resumir la historia, preparar la evolución, sugerir material. Arranca apagada hasta que revises el consentimiento." />
      </Grilla>
    </>
  );
}

type PropsTarjeta = { paciente: Patient; irA: (s: SolapaFicha) => void };

/** Tarjeta de un módulo que todavía no existe: dice en qué etapa llega. */
function Pendiente({ titulo, icono, etapa, texto, color = 'celeste', onPress }: {
  titulo: string; icono: NombreIcono; etapa: string; texto: string; color?: Categoria; onPress?: () => void;
}) {
  return (
    <Caja titulo={titulo} icono={icono} color={color} ver={onPress ? { texto: `Ver ${titulo.toLowerCase()}`, onPress } : undefined}>
      <Texto color={colors.textMuted}>{texto}</Texto>
      <Etiqueta texto={`Llega en la ${etapa}`} tono="neutro" />
    </Caja>
  );
}

const Rotulo = ({ children }: { children: ReactNode }) => <TextoChico style={s.rotulo}>{children}</TextoChico>;
const Vacio = ({ children }: { children: ReactNode }) => <Texto color={colors.textMuted}>{children}</Texto>;

function ResumenClinico({ paciente: p, irA }: PropsTarjeta) {
  const { db } = useApp();
  const problemas = problemasDe(db, p.id, 'medico').filter((x) => x.status === 'activo');
  const alergias = alergiasDe(db, p.id, 'medico');
  return (
    <Caja titulo="Resumen clínico" icono="document-text-outline" color="celeste" ver={{ texto: 'Ver historia clínica', onPress: () => irA('historia') }}>
      <View>
        <Rotulo>Nacimiento</Rotulo>
        <Texto>{textoEG(p)}</Texto>
      </View>
      <View style={{ gap: 2 }}>
        <Rotulo>Alergias</Rotulo>
        {alergias.length === 0 ? <Texto>Sin alergias cargadas</Texto> : null}
        {alergias.map((a) => (
          <View key={a.id} style={s.fila}>
            {a.status === 'confirmada' ? <Ionicons name="warning" size={18} color={colors.alert} /> : null}
            <Texto style={{ flex: 1 }} color={a.status === 'confirmada' ? colors.alert : undefined}>
              {a.allergen}{a.status === 'referida' ? ' (referida)' : ''}
            </Texto>
          </View>
        ))}
      </View>
      <View>
        <Rotulo>Medicación actual</Rotulo>
        <Texto color={colors.textMuted}>Se carga desde la Etapa 5.</Texto>
      </View>
      <View style={{ gap: 2 }}>
        <Rotulo>Problemas activos</Rotulo>
        {problemas.length === 0 ? <Texto>Ninguno</Texto> : problemas.map((x) => <Texto key={x.id}>• {x.description}</Texto>)}
      </View>
    </Caja>
  );
}

function UltimaConsulta({ paciente: p, irA }: PropsTarjeta) {
  const { db } = useApp();
  const c = consultasDe(db, p.id)[0];
  const nota = c ? notaVigente(db, c.id) : undefined;
  return (
    <Caja
      titulo="Última consulta"
      icono="calendar-outline"
      color="celeste"
      ver={c ? { texto: 'Ver consulta completa', onPress: () => router.push(`/medico/consulta/${c.id}`) } : { texto: 'Ver consultas', onPress: () => irA('consultas') }}
    >
      {!c ? <Vacio>Todavía no hay consultas.</Vacio> : (
        <>
          <View>
            <TextoFuerte>{fechaLarga(c.occurredAt)}</TextoFuerte>
            <TextoChico>{TEXTO_VISITA[c.visitType]} · {TEXTO_MODALIDAD[c.modality]}</TextoChico>
          </View>
          {nota?.findings ? <View><Rotulo>Hallazgos</Rotulo><Texto numberOfLines={3}>{nota.findings}</Texto></View> : null}
          {nota?.plan ? <View><Rotulo>Conducta</Rotulo><Texto numberOfLines={3}>{nota.plan}</Texto></View> : null}
          <View style={s.etiquetas}>
            <Etiqueta
              texto={!nota ? 'Sin nota' : nota.status === 'aprobada' ? `Nota aprobada · v${nota.version}` : `Nota en borrador · v${nota.version}`}
              tono={nota?.status === 'aprobada' ? 'celeste' : 'neutro'}
            />
            {nota?.clinicalFlag ? <Etiqueta texto="Bandera" tono="alerta" /> : null}
          </View>
        </>
      )}
    </Caja>
  );
}

function ProximasAcciones({ paciente: p, irA }: PropsTarjeta) {
  const { db } = useApp();
  const ahora = ahoraISO();
  const seguimientos = seguimientosPendientes(db).filter((f) => f.patientId === p.id);
  const fiebre = fiebreDe(db, p.id).filter(sinRevisar).length;
  const g = planPorPlazo(db.carePlan.filter((i) => i.patientId === p.id), hoyISO());
  const plan = [...g.hoy, ...g.treinta].slice(0, 4);
  const nada = seguimientos.length === 0 && fiebre === 0 && plan.length === 0;
  return (
    <Caja titulo="Próximas acciones" icono="flag-outline" color="rosado" ver={{ texto: 'Ver plan de cuidado', onPress: () => irA('plan') }}>
      {nada ? <Vacio>Nada pendiente en los próximos 30 días.</Vacio> : null}
      {seguimientos.map((f) => {
        const vencido = f.dueAt < ahora;
        return (
          <Accion
            key={f.id}
            color="celeste"
            alerta={vencido}
            icono="flag"
            titulo="Seguimiento"
            detalle={`${vencido ? 'Venció' : 'Vence'} el ${fechaCorta(f.dueAt)}`}
            onPress={() => router.push(`/medico/seguimiento/${f.id}`)}
          />
        );
      })}
      {fiebre > 0 ? (
        <Accion color="naranja" icono="thermometer-outline" titulo="Registro de fiebre" detalle={`${fiebre} sin revisar`} onPress={() => router.push(`/medico/fiebre/${p.id}`)} />
      ) : null}
      {plan.map((i) => <ItemPlan key={i.id} item={i} />)}
    </Caja>
  );
}

function ItemPlan({ item: i }: { item: CarePlanItem }) {
  const vencido = !!i.targetDate && i.targetDate < hoyISO();
  return (
    <Accion
      color={COLOR_CATEGORIA[i.category]}
      alerta={vencido}
      icono={i.category === 'vacuna' ? 'shield-checkmark-outline' : i.category === 'prevencion' ? 'leaf-outline' : 'ellipse-outline'}
      titulo={i.description}
      detalle={i.targetDate ? `${vencido ? 'Vencido · ' : ''}${fechaCorta(i.targetDate)}` : 'Sin fecha'}
    />
  );
}

function Accion({ color, alerta, icono, titulo, detalle, onPress }: {
  color: Categoria; alerta?: boolean; icono: NombreIcono; titulo: string; detalle: string; onPress?: () => void;
}) {
  const c = categorias[color];
  const contenido = (
    <View style={[s.accion, { backgroundColor: alerta ? colors.alertBg : c.fondo }]}>
      <Ionicons name={icono} size={20} color={alerta ? colors.alert : c.acento} />
      <View style={{ flex: 1 }}>
        <TextoFuerte style={{ fontSize: 16 }} color={alerta ? colors.alert : c.texto}>{titulo}</TextoFuerte>
        <TextoChico color={alerta ? colors.alert : c.texto}>{detalle}</TextoChico>
      </View>
      {onPress ? <Ionicons name="chevron-forward" size={18} color={alerta ? colors.alert : c.acento} /> : null}
    </View>
  );
  return onPress ? <Tarjeta onPress={onPress} style={s.accionToque} accessibilityLabel={`${titulo}, ${detalle}`}>{contenido}</Tarjeta> : contenido;
}

function Crecimiento({ paciente: p, irA }: PropsTarjeta) {
  const { db } = useApp();
  const filas = filasDeCrecimiento(p, medicionesDe(db, p.id));
  const ultima = filas[filas.length - 1];
  const dato = (titulo: string, m: Medida | undefined, unidad: string) =>
    m ? (
      <View style={s.dato}>
        <TextoChico>{titulo}</TextoChico>
        <TextoFuerte style={{ fontSize: 22 }}>{String(m.valor).replace('.', ',')} {unidad}</TextoFuerte>
        <TextoChico style={{ fontFamily: fonts.bodySemi }} color={categorias.celeste.texto}>
          {m.resultado.ok ? formatoPercentil(m.resultado.percentil) : 'Sin percentilo'}
        </TextoChico>
      </View>
    ) : null;
  return (
    <Caja titulo="Crecimiento" icono="trending-up-outline" color="celeste" ver={{ texto: 'Ver curvas y tabla', onPress: () => irA('crecimiento') }}>
      {!ultima ? <Vacio>Todavía no hay mediciones.</Vacio> : (
        <>
          <MiniCurva valores={filas.map((f) => f.peso?.valor ?? null)} />
          <TextoChico>Peso en cada control · última medición {fechaCorta(ultima.fecha)} · {filas.length} en total</TextoChico>
          <View style={s.datos}>
            {dato('Peso', ultima.peso, 'kg')}
            {dato('Talla', ultima.talla, 'cm')}
            {dato('Perímetro cefálico', ultima.pc, 'cm')}
          </View>
        </>
      )}
    </Caja>
  );
}

/** Mini gráfico del peso en cada control (sin ejes: el detalle está en la pestaña Crecimiento). */
function MiniCurva({ valores }: { valores: (number | null)[] }) {
  const puntos = valores.map((v, i) => ({ i, v })).filter((x): x is { i: number; v: number } => x.v != null);
  if (puntos.length < 2) return null;
  const W = 300, H = 64, m = 6;
  const min = Math.min(...puntos.map((p) => p.v)), max = Math.max(...puntos.map((p) => p.v));
  const x = (i: number) => m + (i / Math.max(1, valores.length - 1)) * (W - 2 * m);
  const y = (v: number) => H - m - ((v - min) / Math.max(0.001, max - min)) * (H - 2 * m);
  const ultimo = puntos[puntos.length - 1];
  return (
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" accessibilityLabel="Mini gráfico del peso">
      <Polyline points={puntos.map((p) => `${x(p.i)},${y(p.v)}`).join(' ')} fill="none" stroke={categorias.celeste.acento} strokeWidth={2.5} />
      {puntos.map((p) => <Circle key={p.i} cx={x(p.i)} cy={y(p.v)} r={p === ultimo ? 4.5 : 3} fill={p === ultimo ? colors.accion : categorias.celeste.acento} />)}
    </Svg>
  );
}

function Vacunas({ paciente: p, irA }: PropsTarjeta) {
  const { db } = useApp();
  const vacunas = db.carePlan.filter((i) => i.patientId === p.id && i.category === 'vacuna' && !i.archivedAt);
  const aplicadas = vacunas.filter((v) => v.done).sort((a, b) => (b.doneAt ?? '').localeCompare(a.doneAt ?? ''));
  const pendientes = vacunas.filter((v) => !v.done).sort((a, b) => (a.targetDate ?? '9').localeCompare(b.targetDate ?? '9'));
  return (
    <Caja titulo="Vacunas" icono="shield-checkmark-outline" color="rosado" ver={{ texto: 'Ver vacunas', onPress: () => irA('vacunas') }}>
      {vacunas.length === 0 ? <Vacio>Sin vacunas cargadas.</Vacio> : null}
      {aplicadas[0] ? (
        <View><Rotulo>Última aplicada</Rotulo><Texto>{aplicadas[0].description}{aplicadas[0].doneAt ? ` · ${fechaCorta(aplicadas[0].doneAt)}` : ''}</Texto></View>
      ) : null}
      {pendientes[0] ? (
        <View><Rotulo>Próxima</Rotulo><Texto>{pendientes[0].description}{pendientes[0].targetDate ? ` · ${fechaCorta(pendientes[0].targetDate)}` : ''}</Texto></View>
      ) : null}
      {aplicadas.length > 0 ? <TextoChico>{aplicadas.length} {aplicadas.length === 1 ? 'aplicada' : 'aplicadas'} en la ficha</TextoChico> : null}
    </Caja>
  );
}

function Documentos({ paciente: p, irA }: PropsTarjeta) {
  const { db } = useApp();
  const certificados = db.certificates
    .filter((c) => c.patientId === p.id && !c.archivedAt)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3);
  return (
    <Caja titulo="Documentos" icono="document-attach-outline" color="celeste" ver={{ texto: 'Ver certificados y documentos', onPress: () => irA('documentos') }}>
      {certificados.length === 0 ? <Vacio>Todavía no hay certificados.</Vacio> : null}
      {certificados.map((c) => (
        <View key={c.id} style={s.fila}>
          <Ionicons name="document-outline" size={20} color={categorias.celeste.acento} />
          <View style={{ flex: 1 }}>
            <Texto>{tipoCertificado(c.type).titulo}</Texto>
            <TextoChico>{fechaCorta(c.date)}</TextoChico>
          </View>
          {c.status === 'anulado' ? <Etiqueta texto="Anulado" tono="neutro" /> : null}
        </View>
      ))}
    </Caja>
  );
}

function PlanPorPlazo({ paciente: p, irA }: PropsTarjeta) {
  const { db } = useApp();
  const g = planPorPlazo(db.carePlan.filter((i) => i.patientId === p.id), hoyISO());
  return (
    <Caja titulo={`Plan de cuidado de ${p.firstName}`} icono="git-network-outline" color="celeste" ancha ver={{ texto: 'Ver plan completo', onPress: () => irA('plan') }}>
      <View style={s.columnas}>
        {PLAZOS.map(({ clave, titulo }) => {
          const c = categorias[COLOR_PLAZO[clave]];
          return (
            <View key={clave} style={s.columna}>
              <View style={[s.plazo, { backgroundColor: c.fondo }]}>
                <Ionicons name={ICONO_PLAZO[clave]} size={18} color={c.acento} />
                <TextoFuerte style={{ fontSize: 16 }} color={c.texto}>{titulo}</TextoFuerte>
              </View>
              {g[clave].length === 0 ? <TextoChico style={{ paddingHorizontal: 4 }}>Nada pendiente</TextoChico> : null}
              {g[clave].map((i) => <ItemPlan key={i.id} item={i} />)}
            </View>
          );
        })}
      </View>
    </Caja>
  );
}

const s = StyleSheet.create({
  rotulo: { fontFamily: fonts.bodySemi, textTransform: 'uppercase', letterSpacing: 0.6, fontSize: 13 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  etiquetas: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  accion: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  accionToque: { padding: 0, borderWidth: 0, boxShadow: 'none' },
  datos: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  dato: { flexGrow: 1, flexBasis: 110, backgroundColor: colors.bg, borderRadius: 12, padding: 12, gap: 2 },
  columnas: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  columna: { flexGrow: 1, flexBasis: 220, minWidth: 0, gap: 8 },
  plazo: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 },
});
