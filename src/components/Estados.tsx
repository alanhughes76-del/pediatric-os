/**
 * Estados comunes de pantalla (prompt maestro 5.1): vacío, cargando, error comprensible
 * y confirmación antes de una acción que no se puede deshacer.
 */
import type { ReactNode } from 'react';
import { ActivityIndicator, Modal, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Subtitulo, Texto } from './Texto';
import { Boton } from './Boton';
import { categorias, colors, size, sombra, type Categoria } from '@/theme';

type NombreIcono = keyof typeof Ionicons.glyphMap;

/** Pantalla o bloque sin datos: dice qué es el espacio y, si corresponde, qué hacer. */
export function EstadoVacio({ icono = 'leaf-outline', titulo, texto, color = 'celeste', accion }: {
  icono?: NombreIcono;
  titulo: string;
  texto?: string;
  color?: Categoria;
  accion?: ReactNode;
}) {
  const c = categorias[color];
  return (
    <View style={s.vacio} accessibilityRole="summary">
      <View style={[s.icono, { backgroundColor: c.fondo }]}>
        <Ionicons name={icono} size={30} color={c.acento} />
      </View>
      <Subtitulo style={s.centro}>{titulo}</Subtitulo>
      {texto ? <Texto color={colors.textMuted} style={s.centro}>{texto}</Texto> : null}
      {accion ? <View style={s.accion}>{accion}</View> : null}
    </View>
  );
}

export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <View style={s.vacio} accessibilityRole="progressbar" accessibilityLabel={texto}>
      <ActivityIndicator size="large" color={colors.accion} />
      <Texto color={colors.textMuted}>{texto}</Texto>
    </View>
  );
}

/** Error que se entiende: qué pasó y qué hacer. Sin mensajes técnicos. */
export function ErrorComprensible({ texto, reintentar }: { texto: string; reintentar?: () => void }) {
  return (
    <View style={[s.error]} accessibilityRole="alert">
      <View style={s.fila}>
        <Ionicons name="alert-circle" size={24} color={colors.alert} />
        <Texto style={{ flex: 1 }} color={colors.alert}>{texto}</Texto>
      </View>
      {reintentar ? <Boton titulo="Probar de nuevo" icono="refresh" variante="contorno" compacto onPress={reintentar} /> : null}
    </View>
  );
}

/** Confirmación antes de una acción destructiva o que no se puede deshacer. */
export function DialogoConfirmar({ visible, titulo, texto, confirmar, onConfirmar, onCancelar }: {
  visible: boolean;
  titulo: string;
  texto: string;
  /** Texto del botón de confirmación ("Anular certificado"). */
  confirmar: string;
  onConfirmar: () => void;
  onCancelar: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancelar}>
      <View style={s.velo}>
        <View style={s.dialogo} accessibilityViewIsModal>
          <View style={s.fila}>
            <Ionicons name="warning" size={24} color={colors.alert} />
            <Subtitulo style={{ flex: 1 }}>{titulo}</Subtitulo>
          </View>
          <Texto>{texto}</Texto>
          <View style={s.botones}>
            <View style={{ flex: 1 }}><Boton titulo="Cancelar" variante="contorno" compacto onPress={onCancelar} /></View>
            <View style={{ flex: 1 }}><Boton titulo={confirmar} variante="alerta" compacto onPress={onConfirmar} /></View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  vacio: { alignItems: 'center', gap: 10, paddingVertical: 36, paddingHorizontal: 20 },
  icono: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  centro: { textAlign: 'center', maxWidth: 480 },
  accion: { marginTop: 8, minWidth: 240 },
  error: { gap: 12, backgroundColor: colors.alertBg, borderColor: colors.alertBorder, borderWidth: 1, borderRadius: size.radius, padding: 16 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  velo: { flex: 1, backgroundColor: 'rgba(30, 43, 77, 0.45)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  dialogo: { width: '100%', maxWidth: 440, backgroundColor: colors.white, borderRadius: 18, padding: 22, gap: 14, boxShadow: sombra },
  botones: { flexDirection: 'row', gap: 10, marginTop: 4 },
});
