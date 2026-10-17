/** "Más" (celular): el resto de los módulos, las herramientas que ya funcionan y la cuenta. */
import { View, StyleSheet } from 'react-native';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/data/store';
import { CONFIGURACION, EN_PESTANAS, MODULOS } from '@/navegacion/modulos';
import { Pantalla } from '@/components/Pantalla';
import { Seccion } from '@/components/Seccion';
import { Tarjeta } from '@/components/Tarjeta';
import { Etiqueta } from '@/components/Etiqueta';
import { TextoFuerte } from '@/components/Texto';
import { colors } from '@/theme';

type NombreIcono = keyof typeof Ionicons.glyphMap;

function Fila({ titulo, icono, href, onPress, etiqueta }: { titulo: string; icono: NombreIcono; href?: Href; onPress?: () => void; etiqueta?: string }) {
  return (
    <Tarjeta onPress={onPress ?? (() => router.push(href!))} accessibilityLabel={titulo} style={s.fila}>
      <Ionicons name={icono} size={22} color={colors.accion} />
      <TextoFuerte style={{ flex: 1 }}>{titulo}</TextoFuerte>
      {etiqueta ? <Etiqueta texto={etiqueta} tono="neutro" /> : null}
      <Ionicons name="chevron-forward" size={20} color={colors.primary3} />
    </Tarjeta>
  );
}

export default function Mas() {
  const { salir } = useApp();
  const resto = MODULOS.filter((m) => !EN_PESTANAS.includes(m.clave));
  return (
    <Pantalla>
      <Seccion titulo="Módulos">
        <View style={s.lista}>
          {resto.map((m) => <Fila key={m.clave} titulo={m.titulo} icono={m.icono} href={m.href} etiqueta={m.pendiente?.etapa} />)}
        </View>
      </Seccion>
      <Seccion titulo="Lo que ya funciona">
        <View style={s.lista}>
          <Fila titulo="Registro de fiebre" icono="thermometer-outline" href="/medico/fiebre" />
          <Fila titulo="Registro de accesos al portal" icono="log-in-outline" href="/medico/accesos" />
        </View>
      </Seccion>
      <Seccion titulo="Cuenta">
        <View style={s.lista}>
          <Fila titulo={CONFIGURACION.titulo} icono={CONFIGURACION.icono} href={CONFIGURACION.href} etiqueta={CONFIGURACION.pendiente?.etapa} />
          <Fila titulo="Cerrar sesión" icono="log-out-outline" onPress={() => { salir(); router.replace('/'); }} />
        </View>
      </Seccion>
    </Pantalla>
  );
}

const s = StyleSheet.create({
  lista: { gap: 8 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
});
