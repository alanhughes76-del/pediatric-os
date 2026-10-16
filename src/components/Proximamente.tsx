import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Subtitulo, Texto } from './Texto';
import { Tarjeta } from './Tarjeta';
import { colors } from '@/theme';

/** Marcador de una sección que se construye en la próxima entrega. */
export function Proximamente({ titulo, incluye }: { titulo: string; incluye: string[] }) {
  return (
    <Tarjeta style={{ gap: 12 }}>
      <View style={s.fila}>
        <Ionicons name="construct-outline" size={24} color={colors.primary3} />
        <Subtitulo style={{ flex: 1 }}>{titulo}</Subtitulo>
      </View>
      <Texto color={colors.textMuted}>Esta sección llega en la próxima entrega. Va a incluir:</Texto>
      {incluye.map((t) => (
        <Texto key={t}>• {t}</Texto>
      ))}
    </Tarjeta>
  );
}

const s = StyleSheet.create({ fila: { flexDirection: 'row', alignItems: 'center', gap: 10 } });
