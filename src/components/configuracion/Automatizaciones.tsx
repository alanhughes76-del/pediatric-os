/**
 * Automatizaciones (prompt maestro 7.21 y 8): qué eventos salen hacia Make, cómo vienen saliendo y
 * cuáles apagar. La URL del webhook y el secreto de la firma viven en el servidor, nunca en la app.
 */
import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useApp } from '@/data/store';
import { CATALOGO, TIPOS_EVENTO, type Audiencia } from '@shared/eventos';
import { fechaHoraCorta } from '@/lib/fechas';
import { Interruptor, Aviso } from '../Formulario';
import { Etiqueta } from '../Etiqueta';
import { Texto, TextoFuerte, TextoChico } from '../Texto';
import { PieGuardar, useGuardarAjuste } from './comun';
import { colors } from '@/theme';

const GRUPOS: { audiencia: Audiencia; titulo: string; detalle: string }[] = [
  { audiencia: 'familia', titulo: 'A las familias', detalle: 'Make les escribe (con la plantilla indicada, si la hay).' },
  { audiencia: 'medico', titulo: 'Avisos para vos', detalle: 'Te llegan por Telegram, con el contacto de la familia para responder.' },
  { audiencia: 'sistema', titulo: 'Sincronización', detalle: 'Para que Make mantenga al día lo que todavía lee (por ejemplo, Notion).' },
];
const ESTADO = {
  pendiente: { texto: 'Pendiente', tono: 'neutro' }, reintentar: { texto: 'Reintentando', tono: 'naranja' }, enviado: { texto: 'Enviado', tono: 'verde' },
  fallido: { texto: 'Falló', tono: 'alerta' }, sin_destino: { texto: 'Sin conexión a Make', tono: 'neutro' }, apagado: { texto: 'Apagado', tono: 'neutro' },
} as const;

export function Automatizaciones() {
  const { db, fuente } = useApp();
  const [apagados, setApagados] = useState<string[]>(db.automatizaciones.apagados);
  const { guardando, mensaje, guardar } = useGuardarAjuste();
  const ultimos = db.outbox.slice(0, 10);
  const cuenta = (s: string) => db.outbox.filter((e) => e.status === s).length;
  const sinConexion = cuenta('sin_destino') > 0 && cuenta('enviado') === 0;

  return (
    <>
      {fuente === 'demo' ? <Aviso texto="En la demostración no sale ningún evento: se ven en Firebase." /> : null}
      {sinConexion ? (
        <Aviso texto="Todavía no está conectado a Make: falta cargar la URL del webhook y el secreto de la firma en el servidor (lo hacemos al crear el proyecto real; ver docs/AUTOMATIZACIONES.md). Mientras tanto los eventos quedan registrados y no sale nada." />
      ) : null}
      {cuenta('fallido') > 0 ? <Aviso tono="alerta" texto={`${cuenta('fallido')} eventos no se pudieron entregar después de 8 intentos. Revisá el escenario de Make.`} /> : null}

      {GRUPOS.map((g) => (
        <View key={g.audiencia} style={s.grupo}>
          <TextoFuerte>{g.titulo}</TextoFuerte>
          <TextoChico>{g.detalle}</TextoChico>
          {TIPOS_EVENTO.filter((t) => CATALOGO[t].audiencia === g.audiencia).map((t) => {
            const def = CATALOGO[t];
            const activo = !apagados.includes(t);
            return (
              <View key={t} style={s.evento}>
                <Interruptor texto={def.descripcion} activo={activo} onCambio={(v) => setApagados((xs) => (v ? xs.filter((x) => x !== t) : [...xs, t]))} />
                <View style={s.etiquetas}>
                  <Etiqueta texto={t} tono="neutro" />
                  {def.plantilla ? <Etiqueta texto={`Plantilla: ${def.plantilla}`} tono="celeste" /> : null}
                  {def.programado ? <Etiqueta texto="Programado" tono="violeta" /> : null}
                </View>
              </View>
            );
          })}
        </View>
      ))}
      <TextoChico>Un evento apagado queda registrado pero no sale hacia Make.</TextoChico>
      <PieGuardar guardando={guardando} mensaje={mensaje} onGuardar={() => void guardar({ clave: 'automatizaciones', datos: { apagados } })} />

      <View style={s.grupo}>
        <TextoFuerte>Últimos eventos</TextoFuerte>
        {ultimos.length === 0 ? <Texto color={colors.textMuted}>Todavía no salió ningún evento.</Texto> : null}
        {ultimos.map((e) => {
          const est = ESTADO[e.status] ?? ESTADO.pendiente;
          return (
            <View key={e.id} style={s.fila}>
              <View style={{ flex: 1 }}>
                <Texto>{CATALOGO[e.type as keyof typeof CATALOGO]?.descripcion ?? e.type}</Texto>
                <TextoChico>{e.createdAt ? fechaHoraCorta(e.createdAt) : ''}{e.attempts ? ` · ${e.attempts} ${e.attempts === 1 ? 'intento' : 'intentos'}` : ''}</TextoChico>
              </View>
              <Etiqueta texto={est.texto} tono={est.tono} />
            </View>
          );
        })}
      </View>
    </>
  );
}

const s = StyleSheet.create({
  grupo: { gap: 8, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
  evento: { gap: 4, paddingVertical: 4 },
  etiquetas: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
