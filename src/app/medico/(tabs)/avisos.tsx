/** Avisos del médico: salen de los datos reales (src/data/avisos.ts). */
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/data/store';
import { avisosDelMedico, type TipoAviso } from '@/data/avisos';
import { Pantalla } from '@/components/Pantalla';
import { Tarjeta } from '@/components/Tarjeta';
import { EstadoVacio } from '@/components/Estados';
import { TextoFuerte, TextoChico } from '@/components/Texto';
import { categorias, colors, type Categoria } from '@/theme';

const ICONO: Record<TipoAviso, keyof typeof Ionicons.glyphMap> = { seguimiento: 'flag', fiebre: 'thermometer-outline', estudio: 'flask-outline', vacuna: 'shield-checkmark-outline', membresia: 'wallet-outline' };
const COLOR: Record<TipoAviso, Categoria> = { seguimiento: 'rosado', fiebre: 'naranja', estudio: 'violeta', vacuna: 'rosado', membresia: 'verde' };

export default function Avisos() {
  const { db } = useApp();
  const avisos = avisosDelMedico(db);
  return (
    <Pantalla>
      {avisos.length === 0 ? (
        <EstadoVacio icono="notifications-outline" color="verde" titulo="Todo al día" texto="No hay seguimientos vencidos, fiebre sin revisar ni membresías por renovar." />
      ) : null}
      {avisos.map((a) => {
        const c = categorias[COLOR[a.tipo]];
        return (
          <Tarjeta key={a.id} onPress={() => router.push(a.href)} accessibilityLabel={`${a.alerta ? 'Vencido. ' : ''}${a.titulo}. ${a.detalle}`}
            style={[s.fila, a.alerta && { backgroundColor: colors.alertBg, borderColor: colors.alertBorder }]}>
            <View style={[s.icono, { backgroundColor: a.alerta ? colors.white : c.fondo }]}>
              <Ionicons name={a.alerta ? 'alert-circle' : ICONO[a.tipo]} size={22} color={a.alerta ? colors.alert : c.acento} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <TextoFuerte color={a.alerta ? colors.alert : undefined}>{a.titulo}</TextoFuerte>
              <TextoChico color={a.alerta ? colors.alert : undefined}>{a.detalle}</TextoChico>
            </View>
            <Ionicons name="chevron-forward" size={22} color={a.alerta ? colors.alert : colors.primary3} />
          </Tarjeta>
        );
      })}
    </Pantalla>
  );
}

const s = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icono: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
