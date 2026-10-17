/**
 * Módulo que todavía no existe: dice en qué etapa llega, qué va a tener y lleva a lo que ya funciona.
 */
import { View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { moduloPorClave } from '@/navegacion/modulos';
import { Pantalla } from '@/components/Pantalla';
import { EstadoVacio } from '@/components/Estados';
import { Boton } from '@/components/Boton';

export default function ModuloPendiente() {
  const { clave } = useLocalSearchParams<{ clave: string }>();
  const m = moduloPorClave(clave);
  if (!m) {
    return (
      <Pantalla>
        <EstadoVacio icono="help-circle-outline" titulo="No encontramos esta sección" accion={<Boton titulo="Ir a Inicio" onPress={() => router.navigate('/medico')} />} />
      </Pantalla>
    );
  }
  return (
    <Pantalla>
      <Stack.Screen options={{ title: m.titulo }} />
      <EstadoVacio
        icono={m.icono}
        color={m.clave === 'ia' ? 'violeta' : 'celeste'}
        titulo={m.pendiente ? `${m.titulo} llega en la ${m.pendiente.etapa}` : m.titulo}
        texto={m.pendiente?.texto}
        accion={m.atajos ? (
          <View style={{ gap: 10 }}>
            {m.atajos.map((a) => <Boton key={a.titulo} titulo={a.titulo} icono={a.icono} variante="secundario" onPress={() => router.navigate(a.href)} />)}
          </View>
        ) : undefined}
      />
    </Pantalla>
  );
}
