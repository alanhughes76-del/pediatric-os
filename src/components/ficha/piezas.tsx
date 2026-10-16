/** Piezas chicas que usan los bloques de la ficha del médico. */
import { useState, type ReactNode } from 'react';
import { View, Pressable, Text, StyleSheet, type KeyboardTypeOptions } from 'react-native';
import { colors, fonts } from '@/theme';
import { Campo } from '../Formulario';
import { Boton } from '../Boton';
import { Tarjeta } from '../Tarjeta';
import { TextoChico, Texto } from '../Texto';

/** Botón de texto, para acciones secundarias dentro de una fila ("Reabrir", "Quitar vínculo"). */
export function BotonTexto({ texto, onPress, tono = 'normal' }: { texto: string; onPress: () => void; tono?: 'normal' | 'alerta' }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" hitSlop={8} style={({ pressed }) => [s.botonTexto, pressed && { opacity: 0.6 }]}>
      <Text style={[s.botonTextoTexto, tono === 'alerta' && { color: colors.alert }]}>{texto}</Text>
    </Pressable>
  );
}

/**
 * "+ Agregar …": muestra el formulario al tocarlo.
 * `guardar` devuelve true si guardó (entonces se cierra), o false si hay errores.
 */
export function Agregar({ titulo, children, guardar, alCancelar }: { titulo: string; children: ReactNode; guardar: () => boolean; alCancelar?: () => void }) {
  const [abierto, setAbierto] = useState(false);
  if (!abierto) return <Boton titulo={`+ ${titulo}`} variante="secundario" onPress={() => setAbierto(true)} />;
  return (
    <Tarjeta style={{ gap: 14, borderColor: colors.primary3 }}>
      {children}
      <Boton titulo="Guardar" icono="checkmark" onPress={() => { if (guardar()) setAbierto(false); }} />
      <Boton titulo="Cancelar" variante="contorno" onPress={() => { setAbierto(false); alCancelar?.(); }} />
    </Tarjeta>
  );
}

/** Dato con "+ Cargar" si está vacío, o "Editar" si tiene valor. */
export function CampoEditable({ etiqueta, valor, onGuardar, keyboardType, placeholder, validar }: {
  etiqueta: string;
  valor?: string;
  onGuardar: (v: string) => void;
  keyboardType?: KeyboardTypeOptions;
  placeholder?: string;
  /** Devuelve un mensaje de error, o undefined si está bien. */
  validar?: (v: string) => string | undefined;
}) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(valor ?? '');
  const [error, setError] = useState<string>();

  if (!editando) {
    return (
      <View style={s.fila}>
        <View style={{ flex: 1 }}>
          <TextoChico>{etiqueta}</TextoChico>
          {valor ? <Texto style={{ fontFamily: fonts.bodySemi }}>{valor}</Texto> : <Texto color={colors.textMuted}>Sin cargar</Texto>}
        </View>
        <BotonTexto texto={valor ? 'Editar' : '+ Cargar'} onPress={() => { setTexto(valor ?? ''); setError(undefined); setEditando(true); }} />
      </View>
    );
  }
  return (
    <View style={{ gap: 8 }}>
      <Campo etiqueta={etiqueta} value={texto} onChangeText={setTexto} keyboardType={keyboardType} placeholder={placeholder} autoCapitalize="none" error={error} autoFocus />
      <View style={s.fila}>
        <View style={{ flex: 1 }}>
          <Boton compacto titulo="Guardar" onPress={() => {
            const e = validar?.(texto.trim());
            if (e) return setError(e);
            onGuardar(texto.trim());
            setEditando(false);
          }} />
        </View>
        <View style={{ flex: 1 }}><Boton compacto titulo="Cancelar" variante="contorno" onPress={() => setEditando(false)} /></View>
      </View>
    </View>
  );
}

export const validarEmail = (v: string) => (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? 'Revisá el email.' : undefined);

const s = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  botonTexto: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 4 },
  botonTextoTexto: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.primary2 },
});
