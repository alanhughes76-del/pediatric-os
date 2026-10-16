import { View, StyleSheet } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/data/store';
import { fiebreDe, sinRevisar } from '@/data/selectores';
import { edades } from '@/lib/edad';
import { Pantalla } from '@/components/Pantalla';
import { Titulo, Texto, TextoFuerte, TextoChico } from '@/components/Texto';
import { Tarjeta } from '@/components/Tarjeta';
import { Seccion } from '@/components/Seccion';
import { Etiqueta } from '@/components/Etiqueta';
import { colors } from '@/theme';

export default function DetalleFamilia() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { db } = useApp();
  const familia = db.families.find((f) => f.id === id);
  if (!familia) return <Pantalla><Texto>No encontramos esta familia.</Texto></Pantalla>;

  const adultos = db.guardians.filter((g) => g.familyId === familia.id);
  const hijos = db.patients.filter((p) => p.familyId === familia.id);

  return (
    <Pantalla>
      <Stack.Screen options={{ title: familia.name }} />
      <Titulo>{familia.name}</Titulo>

      <Seccion titulo="Pacientes">
        {hijos.map((h) => {
          const fiebre = fiebreDe(db, h.id).filter(sinRevisar).length;
          return (
            <Tarjeta key={h.id} onPress={() => router.push(`/medico/hijo/${h.id}`)} accessibilityLabel={`Ver la ficha de ${h.firstName}`}>
              <View style={s.fila}>
                <View style={{ flex: 1, gap: 4 }}>
                  <TextoFuerte style={{ fontSize: 20 }}>{h.firstName} {h.lastName}</TextoFuerte>
                  <Texto color={colors.textMuted}>{edades(h, undefined, 'abreviado').cronologica}</Texto>
                  {fiebre > 0 ? <Etiqueta texto={`${fiebre} de fiebre sin revisar`} tono="azul" /> : null}
                </View>
                <Ionicons name="chevron-forward" size={26} color={colors.primary3} />
              </View>
            </Tarjeta>
          );
        })}
      </Seccion>

      <Seccion titulo="Adultos">
        <Tarjeta style={{ gap: 14 }}>
          {adultos.map((g, i) => (
            <View key={g.id} style={[{ gap: 4 }, i > 0 && s.separador]}>
              <TextoFuerte>{g.firstName} {g.lastName}</TextoFuerte>
              <TextoChico>{g.email}{g.phone ? ` · ${g.phone}` : ''}</TextoChico>
              <Etiqueta texto={g.accessEnabled ? 'Puede entrar al portal' : 'Acceso deshabilitado'} tono={g.accessEnabled ? 'celeste' : 'neutro'} />
            </View>
          ))}
        </Tarjeta>
      </Seccion>
    </Pantalla>
  );
}

const s = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  separador: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
});
