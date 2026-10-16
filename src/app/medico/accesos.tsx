/** Registro de accesos al portal: quién entró, cuándo y desde qué familia (sale del registro de auditoría). */
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/data/store';
import { fechaCorta, hora } from '@/lib/fechas';
import { Pantalla } from '@/components/Pantalla';
import { Tarjeta } from '@/components/Tarjeta';
import { Texto, TextoFuerte, TextoChico } from '@/components/Texto';
import { colors } from '@/theme';

export default function RegistroDeAccesos() {
  const { db } = useApp();
  // Más nuevos primero; en el mismo minuto, el último registrado primero.
  const accesos = db.auditLog
    .map((a, i) => ({ a, i }))
    .filter(({ a }) => a.action === 'login')
    .sort((x, y) => y.a.at.localeCompare(x.a.at) || y.i - x.i)
    .map(({ a }) => a);

  return (
    <Pantalla>
      <Stack.Screen options={{ title: 'Registro de accesos' }} />
      <TextoChico>{accesos.length} {accesos.length === 1 ? 'ingreso' : 'ingresos'} al portal</TextoChico>
      {accesos.length === 0 ? <Texto color={colors.textMuted}>Todavía nadie entró al portal.</Texto> : null}
      {accesos.map((a) => {
        const g = db.guardians.find((x) => x.id === a.actorId);
        const familia = db.families.find((f) => f.id === g?.familyId);
        return (
          <Tarjeta key={a.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Ionicons name="log-in-outline" size={24} color={colors.primary2} />
            <View style={{ flex: 1 }}>
              <TextoFuerte>{g ? `${g.firstName} ${g.lastName}` : 'Adulto'}</TextoFuerte>
              <TextoChico>{familia?.name ?? 'Sin familia'} · {fechaCorta(a.at)} {hora(a.at)}{a.detail ? ` · ${a.detail}` : ''}</TextoChico>
            </View>
          </Tarjeta>
        );
      })}
    </Pantalla>
  );
}
