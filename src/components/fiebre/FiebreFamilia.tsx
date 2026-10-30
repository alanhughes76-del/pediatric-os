/** Registro de fiebre de un hijo, del lado de la familia. */
import { Text, View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '@/data/store';
import { fiebreDe } from '@/data/selectores';
import { SignosDeAlarma } from '../SignosDeAlarma';
import { Boton } from '../Boton';
import { Seccion } from '../Seccion';
import { Tarjeta } from '../Tarjeta';
import { TituloEditorial } from '../TituloEditorial';
import { GraficoFiebre } from './GraficoFiebre';
import { ListaFiebre } from './ListaFiebre';
import { colors, fonts } from '@/theme';

export function FiebreFamilia({ patientId }: { patientId: string }) {
  const { db } = useApp();
  const registros = fiebreDe(db, patientId);
  const nuevo = (tipo: 'toma' | 'antitermico') => router.push({ pathname: '/familia/fiebre/nuevo', params: { paciente: patientId, tipo } });

  return (
    <>
      <View style={{ gap: 2 }}>
        <TituloEditorial texto="Registro de" destacado="fiebre" ondulada />
        <Text style={s.frase}>Te acompaño paso a paso, con calma.</Text>
      </View>
      <SignosDeAlarma />
      <View style={{ gap: 10 }}>
        <Boton titulo="Anotar temperatura" icono="thermometer-outline" onPress={() => nuevo('toma')} />
        <Boton titulo="Anotar antitérmico" icono="medkit-outline" variante="contorno" onPress={() => nuevo('antitermico')} />
      </View>
      <Seccion titulo="Curva de temperatura">
        <Tarjeta><GraficoFiebre registros={registros} /></Tarjeta>
      </Seccion>
      <Seccion titulo="Lo anotado">
        <ListaFiebre registros={registros} vista="familia" />
      </Seccion>
    </>
  );
}

const s = StyleSheet.create({
  frase: { fontFamily: fonts.hand, fontSize: 22, color: colors.primary2 },
});
