/** Piezas de formulario: grandes, legibles y cómodas con una sola mano. */
import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, type TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, size } from '@/theme';
import { TextoChico } from './Texto';

// ---------- Opciones (elegir una) ----------

export interface Opcion<T extends string> { valor: T; texto: string; detalle?: string }

export function Opciones<T extends string>({ opciones, valor, onCambio, etiqueta, columna = false }: {
  opciones: Opcion<T>[];
  valor?: T;
  onCambio: (v: T) => void;
  etiqueta?: string;
  /** Una opción por renglón (para textos largos). */
  columna?: boolean;
}) {
  return (
    <View style={{ gap: 8 }}>
      {etiqueta ? <Text style={s.etiqueta}>{etiqueta}</Text> : null}
      <View style={[s.opciones, columna && { flexDirection: 'column', flexWrap: 'nowrap' }]} accessibilityRole="radiogroup">
        {opciones.map((o) => {
          const activa = o.valor === valor;
          return (
            <Pressable
              key={o.valor}
              onPress={() => onCambio(o.valor)}
              accessibilityRole="radio"
              accessibilityState={{ selected: activa }}
              style={({ pressed }) => [s.opcion, columna && s.opcionColumna, activa && s.opcionActiva, pressed && !activa && { backgroundColor: colors.bgSoft }]}
            >
              <Text style={[s.opcionTexto, activa && { color: colors.white }]}>{o.texto}</Text>
              {o.detalle ? <Text style={[s.opcionDetalle, activa && { color: colors.bgSoft }]}>{o.detalle}</Text> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ---------- Campo de texto ----------

export function Campo({ etiqueta, ayuda, error, style, multiline, ...p }: TextInputProps & { etiqueta?: string; ayuda?: string; error?: string }) {
  const [foco, setFoco] = useState(false);
  return (
    <View style={{ gap: 6, flexShrink: 1 }}>
      {etiqueta ? <Text style={s.etiqueta}>{etiqueta}</Text> : null}
      <TextInput
        placeholderTextColor={colors.textMuted}
        onFocus={(e) => { setFoco(true); p.onFocus?.(e); }}
        onBlur={(e) => { setFoco(false); p.onBlur?.(e); }}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[s.campo, multiline && s.campoMulti, foco && s.campoFoco, error ? s.campoError : null, style]}
        {...p}
      />
      {error ? <TextoChico color={colors.alert}>{error}</TextoChico> : ayuda ? <TextoChico>{ayuda}</TextoChico> : null}
    </View>
  );
}

// ---------- Casilla ----------

export function Casilla({ marcada, onCambio, texto, detalle }: { marcada: boolean; onCambio: (v: boolean) => void; texto: string; detalle?: string }) {
  return (
    <Pressable
      onPress={() => onCambio(!marcada)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: marcada }}
      style={({ pressed }) => [s.casilla, pressed && { backgroundColor: colors.bgSoft }]}
    >
      <Ionicons name={marcada ? 'checkbox' : 'square-outline'} size={28} color={marcada ? colors.primary : colors.primary3} />
      <View style={{ flex: 1 }}>
        <Text style={s.casillaTexto}>{texto}</Text>
        {detalle ? <TextoChico>{detalle}</TextoChico> : null}
      </View>
    </Pressable>
  );
}

// ---------- Interruptor con texto ----------

export function Interruptor({ activo, onCambio, texto }: { activo: boolean; onCambio: (v: boolean) => void; texto: string }) {
  return (
    <Pressable onPress={() => onCambio(!activo)} accessibilityRole="switch" accessibilityState={{ checked: activo }} style={s.interruptor}>
      <Text style={s.interruptorTexto}>{texto}</Text>
      <View style={[s.pista, activo && { backgroundColor: colors.primary2 }]}>
        <View style={[s.perilla, activo && { alignSelf: 'flex-end' }]} />
      </View>
    </Pressable>
  );
}

// ---------- Aviso ----------

export function Aviso({ texto, tono = 'info', icono }: { texto: string; tono?: 'info' | 'alerta'; icono?: keyof typeof Ionicons.glyphMap }) {
  const alerta = tono === 'alerta';
  return (
    <View style={[s.aviso, alerta ? { backgroundColor: colors.alertBg, borderColor: colors.alertBorder } : null]} accessibilityRole={alerta ? 'alert' : undefined}>
      <Ionicons name={icono ?? (alerta ? 'warning' : 'information-circle')} size={22} color={alerta ? colors.alert : colors.primary2} />
      <Text style={[s.avisoTexto, alerta && { color: colors.alert }]}>{texto}</Text>
    </View>
  );
}

/** "Guardando…" / "Guardado" */
export function EstadoGuardado({ pendiente }: { pendiente: boolean }) {
  return (
    <View style={s.guardado}>
      <Ionicons name={pendiente ? 'sync-outline' : 'checkmark-circle-outline'} size={16} color={colors.textMuted} />
      <TextoChico>{pendiente ? 'Guardando…' : 'Guardado'}</TextoChico>
    </View>
  );
}

const s = StyleSheet.create({
  etiqueta: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.text },
  opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  opcion: {
    minHeight: 48, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14,
    borderWidth: 1.5, borderColor: colors.primary3, backgroundColor: colors.white, justifyContent: 'center',
  },
  opcionColumna: { minHeight: 56 },
  opcionActiva: { backgroundColor: colors.primary, borderColor: colors.primary },
  opcionTexto: { fontFamily: fonts.bodySemi, fontSize: 17, color: colors.primary },
  opcionDetalle: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted },
  campo: {
    minHeight: 52, borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.white,
    paddingHorizontal: 14, paddingVertical: 10, fontFamily: fonts.body, fontSize: size.base, color: colors.text,
  },
  campoMulti: { minHeight: 120, paddingTop: 12 },
  campoFoco: { borderColor: colors.primary3 },
  campoError: { borderColor: colors.alert },
  casilla: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingVertical: 6, borderRadius: 10 },
  casillaTexto: { fontFamily: fonts.body, fontSize: size.base, color: colors.text, lineHeight: 24 },
  interruptor: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  interruptorTexto: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 16, color: colors.text },
  pista: { width: 52, height: 30, borderRadius: 15, backgroundColor: colors.border, padding: 3, justifyContent: 'center' },
  perilla: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.white },
  aviso: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start', padding: 14, borderRadius: 12,
    backgroundColor: colors.bgSoft, borderWidth: 1, borderColor: colors.border,
  },
  avisoTexto: { flex: 1, fontFamily: fonts.body, fontSize: 16, lineHeight: 23, color: colors.text },
  guardado: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
