import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/data/store';
import { seguimientosPendientes, paciente, nombreCompleto, TEXTO_VISITA } from '@/data/selectores';
import { ahoraISO, horasEntre, duracion } from '@/lib/fechas';
import { Tarjeta } from './Tarjeta';
import { Texto, TextoFuerte } from './Texto';
import { Etiqueta } from './Etiqueta';
import { colors } from '@/theme';

/** Notas aprobadas con bandera clínica. Salen de la cola solo con "Marcar resuelto". */
export function SeguimientosPendientes() {
  const { db } = useApp();
  const lista = seguimientosPendientes(db);
  const ahora = ahoraISO();
  if (lista.length === 0) return <Texto color={colors.textMuted}>No hay seguimientos pendientes.</Texto>;

  return (
    <View style={{ gap: 10 }}>
      {lista.map((f) => {
        const p = paciente(db, f.patientId);
        const c = db.consultations.find((x) => x.id === f.consultationId);
        const horas = horasEntre(ahora, f.dueAt);
        const vencido = horas < 0;
        return (
          <Tarjeta
            key={f.id}
            onPress={() => router.push(`/medico/seguimiento/${f.id}`)}
            accessibilityLabel={`Seguimiento de ${p?.firstName}: ver mensaje`}
            style={vencido ? { borderColor: colors.alertBorder, backgroundColor: colors.alertBg } : undefined}
          >
            <View style={s.fila}>
              <Ionicons name="flag" size={22} color={vencido ? colors.alert : colors.primary2} />
              <View style={{ flex: 1, gap: 4 }}>
                <TextoFuerte>{p ? nombreCompleto(p) : 'Paciente'}</TextoFuerte>
                <View style={s.etiquetas}>
                  {c ? <Etiqueta texto={TEXTO_VISITA[c.visitType]} tono="celeste" /> : null}
                  <Etiqueta texto={vencido ? `Vencido hace ${duracion(horas)}` : `Vence en ${duracion(horas)}`} tono={vencido ? 'alerta' : 'azul'} />
                </View>
              </View>
              <TextoFuerte color={colors.primary2}>Ver mensaje</TextoFuerte>
            </View>
          </Tarjeta>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  etiquetas: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
