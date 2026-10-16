import type { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { Subtitulo, TextoChico } from './Texto';

export function Seccion({ titulo, bajada, children, accion }: { titulo: string; bajada?: string; children: ReactNode; accion?: ReactNode }) {
  return (
    <View style={s.root}>
      <View style={s.cabecera}>
        <View style={{ flex: 1 }}>
          <Subtitulo>{titulo}</Subtitulo>
          {bajada ? <TextoChico>{bajada}</TextoChico> : null}
        </View>
        {accion}
      </View>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  root: { gap: 10, marginTop: 8 },
  cabecera: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
});
