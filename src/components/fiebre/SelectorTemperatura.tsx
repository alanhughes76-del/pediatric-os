/**
 * Temperatura en grande con botones − y + de a una décima. Se puede escribir tocando el número.
 * Arranca vacía: no hay un valor elegido de antemano que se pueda guardar sin querer.
 */
import { Pressable, Text, TextInput, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { pasoTemperatura } from '@/lib/fiebre';
import { Tarjeta } from '../Tarjeta';
import { Antetitulo, TextoChico } from '../Texto';
import { anilloFoco, colors, fonts } from '@/theme';

function BotonPaso({ icono, etiqueta, principal, onPress }: { icono: 'add' | 'remove'; etiqueta: string; principal?: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      style={(estado) => [s.paso, principal && s.pasoPrincipal, estado.pressed && { opacity: 0.85 }, (estado as { focused?: boolean }).focused && anilloFoco]}
    >
      <Ionicons name={icono} size={28} color={principal ? colors.white : colors.primary} />
    </Pressable>
  );
}

export function SelectorTemperatura({ valor, onCambio, error }: { valor: string; onCambio: (v: string) => void; error?: string }) {
  return (
    <Tarjeta style={s.tarjeta}>
      <Antetitulo>Temperatura</Antetitulo>
      <View style={s.fila}>
        <BotonPaso icono="remove" etiqueta="Bajar una décima" onPress={() => onCambio(pasoTemperatura(valor, -0.1))} />
        <View style={s.numero}>
          <TextInput
            value={valor}
            onChangeText={onCambio}
            keyboardType="decimal-pad"
            inputMode="decimal"
            placeholder="--,-"
            placeholderTextColor={colors.textMuted}
            accessibilityLabel="Temperatura en grados"
            maxLength={4}
            style={s.campo}
          />
          <Text style={s.unidad}>°C</Text>
        </View>
        <BotonPaso icono="add" etiqueta="Subir una décima" principal onPress={() => onCambio(pasoTemperatura(valor, 0.1))} />
      </View>
      {error ? <TextoChico color={colors.alert}>{error}</TextoChico> : <TextoChico>Tocá el número para escribirlo.</TextoChico>}
    </Tarjeta>
  );
}

const s = StyleSheet.create({
  tarjeta: { gap: 12, alignItems: 'center' },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'stretch' },
  paso: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.muted },
  pasoPrincipal: { backgroundColor: colors.accion },
  numero: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center' },
  campo: { flexShrink: 1, width: 118, minHeight: 64, padding: 0, textAlign: 'center', fontFamily: fonts.title, fontSize: 44, color: colors.primary },
  unidad: { marginLeft: 4, fontFamily: fonts.bodyBold, fontSize: 18, color: colors.textMuted },
});
