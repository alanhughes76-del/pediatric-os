/**
 * Reportes (prompt maestro 7.17): reporte mensual con datos reales del sistema, exportable a CSV y PDF.
 * Sin proyecciones. Membresías y pagos pendientes muestran la situación de hoy.
 */
import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useApp } from '@/data/store';
import { csvReporte, filasReporte, htmlReporte, moverMes, nombreMes, reporteMensual } from '@/data/reportes';
import { fechaCorta, hoyISO } from '@/lib/fechas';
import { exportarPdf, exportarTexto } from '@/lib/exportar';
import { Pantalla } from '@/components/Pantalla';
import { Tarjeta } from '@/components/Tarjeta';
import { Boton } from '@/components/Boton';
import { Aviso } from '@/components/Formulario';
import { Titulo, Subtitulo, Texto, TextoFuerte, TextoChico } from '@/components/Texto';
import { colors } from '@/theme';

export default function Reportes() {
  const { db } = useApp();
  const hoy = hoyISO();
  const actual = hoy.slice(0, 7);
  const [mes, setMes] = useState(actual);
  const [error, setError] = useState<string | null>(null);
  const r = reporteMensual(db, mes, hoy);
  const filas = filasReporte(r);
  const secciones = [...new Set(filas.map((f) => f[0]))];
  const nombre = `reporte-${mes}`;

  const exportar = async (como: 'csv' | 'pdf') => {
    setError(null);
    try {
      if (como === 'csv') await exportarTexto(`${nombre}.csv`, csvReporte(r), 'text/csv');
      else await exportarPdf(`${nombre}.pdf`, htmlReporte(r, fechaCorta(hoy)));
    } catch {
      setError('No se pudo exportar. Probá de nuevo.');
    }
  };

  return (
    <Pantalla ancho>
      <Titulo>Reportes</Titulo>
      <View style={s.mes}>
        <Boton titulo="Anterior" icono="chevron-back" variante="contorno" compacto onPress={() => setMes(moverMes(mes, -1))} />
        <Subtitulo style={{ flex: 1, textAlign: 'center' }}>{nombreMes(mes)}</Subtitulo>
        <Boton titulo="Siguiente" icono="chevron-forward" variante="contorno" compacto deshabilitado={mes >= actual} onPress={() => setMes(moverMes(mes, 1))} />
      </View>
      <TextoChico>Solo datos cargados en el sistema. Visitas = consultas realizadas en el mes. Membresías y pagos a confirmar: cómo están hoy.</TextoChico>

      <View style={s.grilla}>
        {secciones.map((sec) => (
          <Tarjeta key={sec} style={s.seccion}>
            <TextoFuerte>{sec}</TextoFuerte>
            {filas.filter((f) => f[0] === sec).map(([, concepto, valor]) => (
              <View key={concepto} style={s.fila}>
                <Texto style={{ flex: 1 }}>{concepto}</Texto>
                <TextoFuerte>{valor}</TextoFuerte>
              </View>
            ))}
          </Tarjeta>
        ))}
      </View>

      {r.pacientesNuevos.length > 0 ? (
        <Tarjeta style={{ gap: 4 }}>
          <TextoFuerte>Pacientes nuevos del mes</TextoFuerte>
          {r.pacientesNuevos.map((p) => <TextoChico key={p.id}>{fechaCorta(p.createdAt)} · {p.firstName} {p.lastName}</TextoChico>)}
          <TextoChico color={colors.textMuted}>Los nombres no van al CSV ni al PDF: solo las cantidades.</TextoChico>
        </Tarjeta>
      ) : null}

      {error ? <Aviso tono="alerta" texto={error} /> : null}
      <View style={s.botones}>
        <View style={{ flex: 1, minWidth: 160 }}><Boton titulo="Exportar CSV" icono="document-text-outline" variante="secundario" onPress={() => void exportar('csv')} /></View>
        <View style={{ flex: 1, minWidth: 160 }}><Boton titulo="Exportar PDF" icono="print-outline" variante="secundario" onPress={() => void exportar('pdf')} /></View>
      </View>
    </Pantalla>
  );
}

const s = StyleSheet.create({
  mes: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  grilla: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  seccion: { flexGrow: 1, flexBasis: 280, gap: 8 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  botones: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
