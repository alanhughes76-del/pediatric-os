/**
 * Agenda y central de turnos (prompt maestro 7.2): vistas diaria, semanal y mensual.
 * En el celular la diaria es la principal. Arriba, siempre, lo que falta confirmar.
 */
import { useState } from 'react';
import { View, Pressable, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { diaDe, sumarDiasA } from '@shared/agenda';
import { useApp } from '@/data/store';
import { porConfirmar, turnosDelDia, turnosEntre } from '@/data/selectores';
import type { Appointment } from '@/data/types';
import { ahoraISO, diaYFecha, hora } from '@/lib/fechas';
import { Pantalla } from '@/components/Pantalla';
import { Titulo, TextoFuerte, TextoChico } from '@/components/Texto';
import { Boton } from '@/components/Boton';
import { Opciones, Aviso } from '@/components/Formulario';
import { EstadoVacio } from '@/components/Estados';
import { TarjetaTurno } from '@/components/agenda/piezas';
import { useEscritorio } from '@/components/escritorio/Marco';
import { anilloFoco, categorias, colors, fonts } from '@/theme';

type Vista = 'dia' | 'semana' | 'mes';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const CORTOS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

/** Día de la semana de un "AAAA-MM-DD": 0 = lunes … 6 = domingo. */
const diaSemana = (dia: string) => (new Date(`${dia}T12:00:00Z`).getUTCDay() + 6) % 7;
const lunesDe = (dia: string) => sumarDiasA(dia, -diaSemana(dia));
const numero = (dia: string) => Number(dia.slice(8, 10));
const mesDe = (dia: string) => `${MESES[Number(dia.slice(5, 7)) - 1]} de ${dia.slice(0, 4)}`;
const primeroDelMes = (dia: string) => `${dia.slice(0, 8)}01`;
const sumarMeses = (dia: string, n: number) => {
  const a = Number(dia.slice(0, 4));
  const m = Number(dia.slice(5, 7)) - 1 + n;
  const fecha = new Date(Date.UTC(a, m, 1));
  return `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, '0')}-01`;
};

export default function Agenda() {
  const { db } = useApp();
  const escritorio = useEscritorio();
  const hoy = diaDe(ahoraISO());
  const [vista, setVista] = useState<Vista>('dia');
  const [dia, setDia] = useState(hoy);
  const pendientes = porConfirmar(db, hoy);
  // En el celular la vista del día va primero: lo pendiente arranca plegado.
  const [verPendientes, setVerPendientes] = useState(escritorio);

  const mover = (n: number) => setDia((d) => (vista === 'dia' ? sumarDiasA(d, n) : vista === 'semana' ? sumarDiasA(d, 7 * n) : sumarMeses(d, n)));
  const titulo = vista === 'dia'
    ? `${diaYFecha(dia)}${dia === hoy ? ' · hoy' : ''}`
    : vista === 'semana'
      ? `Semana del ${numero(lunesDe(dia))} de ${MESES[Number(lunesDe(dia).slice(5, 7)) - 1]}`
      : mesDe(dia)[0].toUpperCase() + mesDe(dia).slice(1);

  return (
    <Pantalla ancho>
      <View style={s.encabezado}>
        <Titulo style={{ flex: 1 }}>Agenda</Titulo>
        <View style={{ minWidth: 150 }}>
          <Boton titulo="+ Turno" compacto onPress={() => router.push({ pathname: '/medico/turno/nuevo', params: { dia } })} />
        </View>
      </View>

      {pendientes.length > 0 ? (
        <View style={{ gap: 10 }}>
          <Pressable
            onPress={() => setVerPendientes((v) => !v)}
            accessibilityRole="button"
            accessibilityState={{ expanded: verPendientes }}
            style={({ pressed }) => [s.pendientes, pressed && { opacity: 0.85 }]}
          >
            <Ionicons name="hourglass-outline" size={22} color={categorias.naranja.texto} />
            <TextoFuerte style={{ flex: 1 }} color={categorias.naranja.texto}>
              {pendientes.length} por confirmar ({pendientes.length === 1 ? 'solicitud o turno pendiente' : 'solicitudes y turnos pendientes'})
            </TextoFuerte>
            <Ionicons name={verPendientes ? 'chevron-up' : 'chevron-down'} size={22} color={categorias.naranja.texto} />
          </Pressable>
          {verPendientes ? pendientes.map((t) => (
            <View key={t.id} style={{ gap: 4 }}>
              <TextoChico>{diaYFecha(t.day)}</TextoChico>
              <TarjetaTurno turno={t} />
            </View>
          )) : null}
        </View>
      ) : null}

      <Opciones
        opciones={[{ valor: 'dia', texto: 'Día' }, { valor: 'semana', texto: 'Semana' }, { valor: 'mes', texto: 'Mes' }]}
        valor={vista}
        onCambio={setVista}
        etiqueta="Ver"
      />

      <View style={s.navegacion}>
        <BotonFlecha icono="chevron-back" etiqueta="Anterior" onPress={() => mover(-1)} />
        <TextoFuerte style={s.tituloVista}>{titulo}</TextoFuerte>
        <BotonFlecha icono="chevron-forward" etiqueta="Siguiente" onPress={() => mover(1)} />
        {dia !== hoy ? <View style={{ minWidth: 90 }}><Boton titulo="Hoy" compacto variante="secundario" onPress={() => setDia(hoy)} /></View> : null}
      </View>

      {vista === 'dia' ? <VistaDia dia={dia} /> : null}
      {vista === 'semana' ? <VistaSemana dia={dia} escritorio={escritorio} onElegir={(d) => { setDia(d); setVista('dia'); }} /> : null}
      {vista === 'mes' ? <VistaMes dia={dia} hoy={hoy} onElegir={(d) => { setDia(d); setVista('dia'); }} /> : null}
    </Pantalla>
  );
}

function BotonFlecha({ icono, etiqueta, onPress }: { icono: 'chevron-back' | 'chevron-forward'; etiqueta: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={etiqueta} style={({ pressed, focused }: { pressed: boolean; focused?: boolean }) => [s.flecha, pressed && { backgroundColor: colors.bgSoft }, focused && anilloFoco]}>
      <Ionicons name={icono} size={24} color={colors.primary} />
    </Pressable>
  );
}

function VistaDia({ dia }: { dia: string }) {
  const { db } = useApp();
  const [verCancelados, setVerCancelados] = useState(false);
  const todos = turnosDelDia(db, dia, true);
  const vigentes = todos.filter((t) => t.status !== 'cancelado' && t.status !== 'ausente');
  const caidos = todos.filter((t) => !vigentes.includes(t));
  const franjas = db.agenda.horarios[(diaSemana(dia) + 1) % 7] ?? [];
  const bloqueos = db.blocks.filter((b) => !b.archivedAt && b.desde.slice(0, 10) <= dia && b.hasta.slice(0, 10) >= dia);

  return (
    <View style={{ gap: 12 }}>
      <TextoChico>
        {franjas.length > 0 ? `Atención: ${franjas.map((f) => `${f.desde} a ${f.hasta}`).join(' y ')}` : 'Este día no tiene horario de atención cargado.'}
        {` · Buffer de traslado: ${db.agenda.bufferMin} min`}
      </TextoChico>
      {bloqueos.map((b) => (
        <Aviso key={b.id} icono="lock-closed-outline" texto={`Bloqueado de ${hora(b.desde)} a ${hora(b.hasta)}${b.motivo ? `: ${b.motivo}` : ''}.`} />
      ))}
      {vigentes.length === 0 ? (
        <EstadoVacio
          icono="calendar-outline"
          titulo="No hay turnos este día"
          accion={<Boton titulo="+ Turno" variante="secundario" onPress={() => router.push({ pathname: '/medico/turno/nuevo', params: { dia } })} />}
        />
      ) : null}
      {vigentes.map((t) => <TarjetaTurno key={t.id} turno={t} />)}
      {caidos.length > 0 ? (
        <>
          <Boton
            titulo={verCancelados ? 'Ocultar cancelados y ausentes' : `Ver cancelados y ausentes (${caidos.length})`}
            variante="contorno"
            compacto
            onPress={() => setVerCancelados((v) => !v)}
          />
          {verCancelados ? caidos.map((t) => <TarjetaTurno key={t.id} turno={t} />) : null}
        </>
      ) : null}
    </View>
  );
}

function VistaSemana({ dia, escritorio, onElegir }: { dia: string; escritorio: boolean; onElegir: (d: string) => void }) {
  const { db } = useApp();
  const lunes = lunesDe(dia);
  const dias = Array.from({ length: 7 }, (_, i) => sumarDiasA(lunes, i));
  const turnos = turnosEntre(db, dias[0], dias[6]);
  const delDia = (d: string) => turnos.filter((t) => t.day === d);

  if (escritorio) {
    return (
      <View style={s.semana}>
        {dias.map((d, i) => (
          <View key={d} style={s.columnaDia}>
            <Pressable onPress={() => onElegir(d)} accessibilityRole="button" accessibilityLabel={`Ver el ${diaYFecha(d)}`} style={s.cabeceraDia}>
              <TextoChico>{CORTOS[i]}</TextoChico>
              <TextoFuerte>{numero(d)}</TextoFuerte>
            </Pressable>
            {delDia(d).map((t) => <TarjetaTurno key={t.id} turno={t} compacta />)}
          </View>
        ))}
      </View>
    );
  }
  return (
    <View style={{ gap: 14 }}>
      {dias.map((d) => (
        <View key={d} style={{ gap: 8 }}>
          <Pressable onPress={() => onElegir(d)} accessibilityRole="button" accessibilityLabel={`Ver el ${diaYFecha(d)}`}>
            <TextoFuerte>{diaYFecha(d)}</TextoFuerte>
          </Pressable>
          {delDia(d).length === 0 ? <TextoChico>Sin turnos.</TextoChico> : delDia(d).map((t) => <TarjetaTurno key={t.id} turno={t} />)}
        </View>
      ))}
    </View>
  );
}

function VistaMes({ dia, hoy, onElegir }: { dia: string; hoy: string; onElegir: (d: string) => void }) {
  const { db } = useApp();
  const primero = primeroDelMes(dia);
  const inicio = lunesDe(primero);
  const ultimo = sumarDiasA(sumarMeses(dia, 1), -1);
  const semanas = Math.ceil((diaSemana(primero) + numero(ultimo)) / 7);
  const dias = Array.from({ length: semanas * 7 }, (_, i) => sumarDiasA(inicio, i));
  const turnos = turnosEntre(db, dias[0], dias[dias.length - 1]);
  const conteo = (d: string) => turnos.filter((t) => t.day === d);

  return (
    <View style={{ gap: 6 }}>
      <View style={s.filaMes}>
        {CORTOS.map((c) => <Text key={c} style={s.cabeceraMes}>{c}</Text>)}
      </View>
      {Array.from({ length: semanas }, (_, w) => (
        <View key={w} style={s.filaMes}>
          {dias.slice(w * 7, w * 7 + 7).map((d) => {
            const delDia = conteo(d);
            const sinConfirmar = delDia.some((t: Appointment) => t.status === 'solicitado' || t.status === 'pendiente');
            const fuera = d.slice(0, 7) !== primero.slice(0, 7);
            return (
              <Pressable
                key={d}
                onPress={() => onElegir(d)}
                accessibilityRole="button"
                accessibilityLabel={`${diaYFecha(d)}: ${delDia.length} ${delDia.length === 1 ? 'turno' : 'turnos'}`}
                style={({ pressed }) => [s.celda, d === hoy && s.celdaHoy, fuera && { opacity: 0.45 }, pressed && { backgroundColor: colors.bgSoft }]}
              >
                <Text style={[s.numeroDia, d === hoy && { color: colors.accion }]}>{numero(d)}</Text>
                {delDia.length > 0 ? (
                  <View style={[s.cantidad, sinConfirmar && { backgroundColor: categorias.naranja.fondo }]}>
                    <Text style={[s.cantidadTexto, sinConfirmar && { color: categorias.naranja.texto }]}>{delDia.length}</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ))}
      <TextoChico>El número es la cantidad de turnos del día; en naranja, si hay alguno sin confirmar. Tocá un día para verlo.</TextoChico>
    </View>
  );
}

const s = StyleSheet.create({
  encabezado: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pendientes: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingHorizontal: 14, borderRadius: 14, backgroundColor: categorias.naranja.fondo },
  navegacion: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tituloVista: { flex: 1, textAlign: 'center', fontSize: 18 },
  flecha: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.white },
  semana: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  columnaDia: { flex: 1, gap: 6, minWidth: 0 },
  cabeceraDia: { alignItems: 'center', paddingVertical: 6, borderRadius: 10, backgroundColor: categorias.celeste.fondo },
  filaMes: { flexDirection: 'row', gap: 6 },
  cabeceraMes: { flex: 1, textAlign: 'center', fontFamily: fonts.bodySemi, fontSize: 13, color: colors.textMuted },
  celda: { flex: 1, minHeight: 56, borderRadius: 10, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, padding: 6, alignItems: 'center', gap: 4 },
  celdaHoy: { borderColor: colors.accion, borderWidth: 2 },
  numeroDia: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text },
  cantidad: { minWidth: 24, paddingHorizontal: 6, borderRadius: 12, backgroundColor: categorias.celeste.fondo, alignItems: 'center' },
  cantidadTexto: { fontFamily: fonts.bodyBold, fontSize: 13, color: categorias.celeste.texto },
});

