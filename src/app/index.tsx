/**
 * Primera pantalla. Modo demostración: selector de rol e ingreso de familias con enlace mágico
 * simulado (/ingresar). Modo Firebase: ingreso real del equipo (components/IngresoEquipo.tsx).
 * Nadie se registra solo: el médico habilita a cada adulto.
 */
import { View, StyleSheet } from 'react-native';
import { Redirect, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '@/data/store';
import { Pantalla } from '@/components/Pantalla';
import { Marca } from '@/components/Marca';
import { Saludo } from '@/components/Saludo';
import { Subtitulo, Texto, TextoChico } from '@/components/Texto';
import { Boton } from '@/components/Boton';
import { Etiqueta } from '@/components/Etiqueta';
import { colors } from '@/theme';
import { IngresoEquipo } from '@/components/IngresoEquipo';
import { Cargando } from '@/components/Estados';

export default function Inicio() {
  const { sesion, listo, fuente } = useApp();
  if (!listo) return <Cargando texto="Abriendo…" />;
  if (sesion) return <Redirect href={sesion.rol === 'familia' ? '/familia' : '/medico'} />;
  return fuente === 'firebase' ? <IngresoEquipo /> : <SelectorDeRol />;
}

function SelectorDeRol() {
  const { db, entrarComoMedico, entrarComoAsistente, entrarComoAdulto } = useApp();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <Pantalla>
        <View style={s.cabecera}>
          <Marca grande centrada />
          <Saludo />
        </View>

        <View style={s.aviso}>
          <Etiqueta texto="Modo prueba" tono="azul" />
          <TextoChico>Datos de ejemplo, todos ficticios. Elegí con qué rol querés entrar.</TextoChico>
        </View>

        <Subtitulo>Médico</Subtitulo>
        <Boton titulo="Entrar como Dr. Hughes" icono="medkit-outline" onPress={() => { entrarComoMedico(); router.replace('/medico'); }} />
        <Boton titulo="Entrar como asistente" detalle="Agenda, familias, membresías y pagos; sin datos clínicos" icono="briefcase-outline" variante="secundario"
          onPress={() => { entrarComoAsistente(); router.replace('/medico'); }} />

        <Subtitulo style={{ marginTop: 12 }}>Adultos responsables</Subtitulo>
        <Boton titulo="Ingresar con mi email" icono="mail-outline" variante="secundario" onPress={() => router.push('/ingresar')} />
        <TextoChico>O entrá directo como uno de los adultos de ejemplo:</TextoChico>
        {db.families.map((f) => (
          <View key={f.id} style={{ gap: 8 }}>
            <Texto color={colors.textMuted}>{f.name}</Texto>
            {db.guardians.filter((g) => g.familyId === f.id).map((g) => (
              <Boton
                key={g.id}
                variante="contorno"
                icono="person-outline"
                titulo={`${g.firstName} ${g.lastName}`}
                detalle={g.accessEnabled ? g.email : 'Acceso deshabilitado por el médico'}
                deshabilitado={!g.accessEnabled}
                onPress={() => { entrarComoAdulto(g.id); router.replace('/familia'); }}
              />
            ))}
          </View>
        ))}
      </Pantalla>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  cabecera: { alignItems: 'center', paddingVertical: 24, gap: 18 },
  aviso: { gap: 6, alignItems: 'flex-start' },
});
